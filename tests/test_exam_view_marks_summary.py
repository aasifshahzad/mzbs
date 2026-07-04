from schemas.view_marks_model import StudentMarkByDate, StudentMarksViewRow, enrich_student_mark_rows


def test_enrich_student_mark_rows_assigns_totals_and_positions():
    rows = [
        StudentMarksViewRow(
            student_id=1,
            student_name="Alice",
            marks=[
                StudentMarkByDate(exam_date="2024-01-01", obtained_marks=30, total_marks=50),
                StudentMarkByDate(exam_date="2024-02-01", obtained_marks=20, total_marks=50),
            ],
        ),
        StudentMarksViewRow(
            student_id=2,
            student_name="Bob",
            marks=[
                StudentMarkByDate(exam_date="2024-01-01", obtained_marks=40, total_marks=50),
                StudentMarkByDate(exam_date="2024-02-01", obtained_marks=20, total_marks=50),
            ],
        ),
    ]

    enriched = enrich_student_mark_rows(rows)

    assert enriched[0].student_id == 2
    assert enriched[0].total_obtained_marks == 60
    assert enriched[0].total_marks == 100
    assert enriched[0].position == 1

    assert enriched[1].student_id == 1
    assert enriched[1].total_obtained_marks == 50
    assert enriched[1].total_marks == 100
    assert enriched[1].position == 2
