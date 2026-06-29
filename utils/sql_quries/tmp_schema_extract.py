import ast
from pathlib import Path

root = Path('schemas')

def arg_value(node):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parts=[]
        while isinstance(node, ast.Attribute):
            parts.append(node.attr)
            node=node.value
        if isinstance(node, ast.Name):
            parts.append(node.id)
        return '.'.join(reversed(parts))
    if isinstance(node, ast.Call):
        return f"CALL({arg_value(node.func)})"
    if isinstance(node, ast.List):
        return [arg_value(e) for e in node.elts]
    if isinstance(node, ast.Tuple):
        return tuple(arg_value(e) for e in node.elts)
    return ast.dump(node)

for pyfile in sorted(root.glob('*.py')):
    text = pyfile.read_text(encoding='utf-8')
    tree = ast.parse(text, filename=str(pyfile))
    classes=[]
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            table = False
            bases = [arg_value(b) for b in node.bases]
            for b in node.bases:
                if isinstance(b, ast.Call) and arg_value(b.func) == 'SQLModel':
                    for kw in b.keywords:
                        if kw.arg == 'table' and arg_value(kw.value) is True:
                            table = True
                if isinstance(b, ast.Name) and b.id == 'SQLModel':
                    table = True
            if table:
                fields=[]
                for n in node.body:
                    if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name):
                        name = n.target.id
                        typ = arg_value(n.annotation) if n.annotation else None
                        default = None
                        nullable = None
                        foreign_key = None
                        sa_column = None
                        primary_key = False
                        index = False
                        unique = False
                        if n.value is not None:
                            if isinstance(n.value, ast.Call) and arg_value(n.value.func).endswith('Field'):
                                args = n.value.args
                                keywords = {kw.arg: arg_value(kw.value) for kw in n.value.keywords if kw.arg}
                                if args:
                                    default = arg_value(args[0])
                                default = keywords.get('default', default)
                                nullable = keywords.get('nullable', None)
                                foreign_key = keywords.get('foreign_key', None)
                                primary_key = keywords.get('primary_key', False)
                                index = keywords.get('index', False)
                                unique = keywords.get('unique', False)
                                sa_column = keywords.get('sa_column', None)
                            else:
                                default = arg_value(n.value)
                        fields.append((name, typ, default, nullable, foreign_key, primary_key, index, unique, sa_column))
                classes.append((node.name, bases, table, fields))
    if classes:
        print(f'FILE: {pyfile}')
        for name, bases, table, fields in classes:
            print('CLASS', name, 'bases=', bases, 'table=', table)
            for field in fields:
                print(' ', field)
        print()
