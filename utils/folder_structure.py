import os
import argparse

IGNORE_FOLDERS = {".venv", "__pycache__", ".git", ".next", "node_modules"}


def build_tree(start_path):
    """Recursively build a sorted tree structure of directories and files."""
    tree = {
        "name": os.path.basename(start_path.rstrip(os.sep)) or start_path,
        "children": [],
        "is_dir": True,
    }

    try:
        entries = sorted(
            os.listdir(start_path),
            key=lambda name: (not os.path.isdir(os.path.join(start_path, name)), name.lower()),
        )
    except OSError:
        return tree

    for entry in entries:
        if entry in IGNORE_FOLDERS:
            continue

        full_path = os.path.join(start_path, entry)
        if os.path.isdir(full_path):
            tree["children"].append(build_tree(full_path))
        else:
            tree["children"].append({"name": entry, "children": [], "is_dir": False})

    return tree


def format_tree(node, prefix="", is_last=True):
    """Format a tree node into a printable string list."""
    connector = "└── " if is_last else "├── "
    lines = [f"{prefix}{connector}{node['name']}"]

    if node["is_dir"] and node["children"]:
        next_prefix = f"{prefix}{'    ' if is_last else '│   '}"
        for idx, child in enumerate(node["children"]):
            lines.extend(format_tree(child, next_prefix, idx == len(node["children"]) - 1))

    return lines


def main():
    parser = argparse.ArgumentParser(description="Print a formatted folder tree.")
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Root path to print (default: current working directory)",
    )
    args = parser.parse_args()

    start_path = os.path.abspath(args.path)
    if not os.path.exists(start_path):
        print(f"Error: {start_path} does not exist")
        return

    tree = build_tree(start_path)
    print(f"Folder structure for: {start_path}\n")

    # Print root name explicitly for top-level directory
    root_name = os.path.basename(start_path.rstrip(os.sep)) or start_path
    print(root_name)
    for idx, child in enumerate(tree["children"]):
        lines = format_tree(child, prefix="", is_last=idx == len(tree["children"]) - 1)
        print("\n".join(lines))


if __name__ == "__main__":
    main()
