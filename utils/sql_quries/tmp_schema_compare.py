import ast
from pathlib import Path
from typing import Dict, List, Optional, Any

root = Path(__file__).resolve().parent
schema_md_path = root / "docs" / "Pasted_content_formatted.md"
if not schema_md_path.exists():
    raise FileNotFoundError("Schema markdown not found")

schema_text = schema_md_path.read_text(encoding="utf-8")
lines = schema_text.splitlines()


def parse_markdown_table_section(lines: List[str], start_marker: str, header_names: List[str], min_parts: int) -> List[List[str]]:
    start = None
    for i, line in enumerate(lines):
        if start_marker in line:
            start = i + 1
            break
    if start is None:
        return []

    rows: List[List[str]] = []
    in_table = False
    for line in lines[start:]:
        if not line.strip():
            if in_table:
                break
            continue
        if not line.strip().startswith("|"):
            if in_table:
                break
            continue
        parts = [part.strip() for part in line.split("|")]
        if len(parts) < min_parts:
            continue
        if parts[2:2 + len(header_names)] == header_names:
            in_table = True
            continue
        if not parts[1].isdigit():
            continue
        in_table = True
        rows.append(parts)
    return rows

# Parse DB table list from the first section
list_rows = parse_markdown_table_section(
    lines,
    "SELECT table_name, table_type",
    ["table_name", "table_type"],
    4,
)

db_table_names = [row[2] for row in list_rows]

# Parse columns from the markdown output
column_rows = parse_markdown_table_section(
    lines,
    "ORDER BY c.table_name, c.ordinal_position",
    ["table_name", "column_name"],
    9,
)

if not column_rows:
    raise SystemExit("No column rows found in schema markdown")

DbColumn = Dict[str, str]
db_tables: Dict[str, List[DbColumn]] = {}
for parts in column_rows:
    table = parts[2]
    column_name = parts[3]
    db_tables.setdefault(table, []).append(
        {
            "column_name": column_name,
            "data_type": parts[4],
            "pg_type": parts[5],
            "char_max": parts[6],
            "is_nullable": parts[7],
            "default": parts[8],
        }
    )

MODEL_PATHS = [
    root / "schemas" / "attendance_model.py",
    root / "schemas" / "attendance_time_model.py",
    root / "schemas" / "attendance_value_model.py",
    root / "schemas" / "class_names_model.py",
    root / "schemas" / "admission_model.py",
    root / "schemas" / "salary_model.py",
    root / "schemas" / "income_model.py",
    root / "schemas" / "income_cat_names_model.py",
    root / "schemas" / "fee_model.py",
    root / "schemas" / "expense_model.py",
    root / "schemas" / "expense_cat_names_model.py",
    root / "schemas" / "teacher_names_model.py",
    root / "schemas" / "students_model.py",
    root / "user" / "user_models.py",
]


def unparse(node: Optional[ast.AST]) -> str:
    if node is None:
        return ""
    return ast.unparse(node)


def is_sqlmodel_class(node: ast.ClassDef) -> bool:
    return any(
        isinstance(kw.arg, str) and kw.arg == "table" and isinstance(kw.value, ast.Constant) and kw.value.value is True
        for kw in node.keywords
    )


def class_tablename(node: ast.ClassDef) -> str:
    for body_item in node.body:
        if isinstance(body_item, ast.Assign):
            for target in body_item.targets:
                if isinstance(target, ast.Name) and target.id == "__tablename__" and isinstance(body_item.value, ast.Constant):
                    return str(body_item.value.value)
    return node.name.lower()


def optional_annotation(annotation: Optional[ast.AST]) -> bool:
    if annotation is None:
        return False
    text = unparse(annotation)
    return "Optional" in text or "None" in text or "| None" in text or "None |" in text


def parse_field(node: ast.AST) -> Optional[Dict[str, Any]]:
    if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
        name = node.target.id
        annotation = node.annotation
        value = node.value
    elif isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
        name = node.targets[0].id
        annotation = None
        value = node.value
    else:
        return None

    if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id == "Relationship":
        return None
    if isinstance(value, ast.Call) and isinstance(value.func, ast.Attribute) and value.func.attr == "Relationship":
        return None

    nullable = optional_annotation(annotation)
    foreign_key = None
    primary_key = False
    if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id == "Field":
        kw = {kw.arg: kw.value for kw in value.keywords if kw.arg is not None}
        if "nullable" in kw and isinstance(kw["nullable"], ast.Constant):
            nullable = bool(kw["nullable"].value)
        if "foreign_key" in kw and isinstance(kw["foreign_key"], ast.Constant):
            foreign_key = str(kw["foreign_key"].value)
        if "primary_key" in kw and isinstance(kw["primary_key"], ast.Constant):
            primary_key = bool(kw["primary_key"].value)
            if primary_key:
                nullable = False
        if annotation is None and value.args:
            annotation = value.args[0] if isinstance(value.args[0], ast.AST) else annotation

    if annotation is None:
        return None

    return {
        "name": name,
        "annotation": unparse(annotation),
        "nullable": nullable,
        "foreign_key": foreign_key,
        "primary_key": primary_key,
    }


def class_name_from_base(expr: ast.AST) -> Optional[str]:
    if isinstance(expr, ast.Name):
        return expr.id
    if isinstance(expr, ast.Attribute):
        return expr.attr
    if isinstance(expr, ast.Subscript) and isinstance(expr.value, ast.Name):
        return expr.value.id
    return None


def parse_model_file(path: Path) -> Dict[str, Any]:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source)
    class_data: Dict[str, Any] = {}

    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        fields: List[Dict[str, Any]] = []
        for item in node.body:
            field = parse_field(item)
            if field is not None:
                fields.append(field)
        bases = [class_name_from_base(base) for base in node.bases if class_name_from_base(base)]
        class_data[node.name] = {
            "fields": fields,
            "bases": bases,
            "tablename": class_tablename(node),
            "is_table": is_sqlmodel_class(node),
        }

    def inherit_fields(class_name: str, seen: Optional[set] = None) -> List[Dict[str, Any]]:
        if seen is None:
            seen = set()
        if class_name in seen:
            return []
        seen.add(class_name)
        data = class_data.get(class_name)
        if data is None:
            return []
        combined: Dict[str, Dict[str, Any]] = {}
        for base in data["bases"]:
            for field in inherit_fields(base, seen):
                combined[field["name"]] = field
        for field in data["fields"]:
            combined[field["name"]] = field
        return list(combined.values())

    table_map: Dict[str, List[Dict[str, Any]]] = {}
    for class_name, data in class_data.items():
        if not data["is_table"]:
            continue
        fields = inherit_fields(class_name)
        if fields:
            table_map[data["tablename"]] = fields
    return table_map

model_tables: Dict[str, List[Dict[str, Any]]] = {}
for path in MODEL_PATHS:
    if not path.exists():
        print(f"WARNING: missing model file {path}")
        continue
    model_tables.update(parse_model_file(path))

print(f"Parsed {len(model_tables)} SQLModel table classes from AST")

print("\nDatabase tables:")
for name in sorted(db_table_names):
    print(f"- {name}")

print("\nModel tables:")
for name in sorted(model_tables):
    print(f"- {name}")

print("\nTable mismatches:")
for name in sorted(db_table_names):
    if name not in model_tables:
        print(f"MISSING MODEL: {name}")
for name in sorted(model_tables):
    if name not in db_table_names:
        print(f"MISSING DB TABLE: {name}")


def normalize_model_type(annotation: str) -> str:
    a = annotation.lower()
    if "int" in a:
        return "integer"
    if "decimal" in a or "numeric" in a:
        return "numeric"
    if "float" in a:
        return "double precision"
    if "datetime" in a:
        return "timestamp"
    if "str" in a or "varchar" in a or "string" in a:
        return "varchar"
    if "bool" in a:
        return "boolean"
    if "json" in a:
        return "jsonb"
    return a


def normalize_db_type(data_type: str, pg_type: str) -> str:
    dt = data_type.lower().strip()
    if dt == "user-defined":
        dt = pg_type.lower().strip()
    if dt == "timestamp without time zone":
        return "timestamp"
    if dt == "timestamp with time zone":
        return "timestamp"
    if dt == "character varying":
        return "varchar"
    if dt == "double precision":
        return "double precision"
    if dt == "integer":
        return "integer"
    return dt

for table_name in sorted(model_tables):
    if table_name not in db_tables:
        continue
    db_cols = {col["column_name"]: col for col in db_tables[table_name]}
    model_cols = {field["name"]: field for field in model_tables[table_name]}
    print(f"\n=== TABLE {table_name} ===")
    for name, field in sorted(model_cols.items()):
        if name not in db_cols:
            print(f"MODEL ONLY COLUMN: {table_name}.{name} annotation={field['annotation']} nullable={field['nullable']} foreign_key={field['foreign_key']}")
            continue
        db_col = db_cols[name]
        model_type = normalize_model_type(field["annotation"])
        db_type = normalize_db_type(db_col["data_type"], db_col["pg_type"])
        if model_type != db_type:
            if not (model_type == "varchar" and db_type.startswith("character varying")):
                if not (model_type == "timestamp" and db_type == "timestamp"):
                    if not (model_type == "integer" and db_type in {"int4", "integer"}):
                        if not (model_type == "numeric" and db_type in {"double precision", "numeric"}):
                            print(f"TYPE MISMATCH: {table_name}.{name} model={model_type} db={db_type}")
        db_nullable = db_col["is_nullable"].upper() == "YES"
        if field["primary_key"]:
            db_nullable = False
        if field["nullable"] != db_nullable:
            print(f"NULLABILITY MISMATCH: {table_name}.{name} model_nullable={field['nullable']} db_nullable={db_nullable}")
    for name, col in sorted(db_cols.items()):
        if name not in model_cols:
            print(f"DB ONLY COLUMN: {table_name}.{name} type={col['data_type']}({col['pg_type']}) nullable={col['is_nullable']}")
