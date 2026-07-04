# Class Subjects Implementation Summary

## Overview
A new admin setup page named "Class Subjects" was added to let administrators assign subjects to each class.

## What was added
- New backend router for managing class-subject relationships at /class_subject
- New database model for storing class-to-subject mappings
- New admin setup page under the Setup section in the dashboard
- New frontend page and manager component for selecting a class and managing its subjects
- New frontend API layer for class-subject CRUD and set operations
- Sidebar navigation entry for "Class Subjects"

## Backend changes
- Added new schema file: schemas/class_subject_model.py
- Added new router file: router/class_subjects.py
- Registered the router in main.py

## Frontend changes
- Added page: frontend/src/app/dashboard/setup/class_subject/page.tsx
- Added component: frontend/src/components/ClassSubject/ClassSubjectManager.tsx
- Added API file: frontend/src/api/ClassSubject/ClassSubjectAPI.ts
- Added model file: frontend/src/models/classSubject/classSubject.ts
- Added sidebar menu item for the new page

## Supported behavior
- Admin can select a class from a dropdown
- Admin can add or remove subjects for the selected class
- The selected subjects are saved through the backend
- The page displays the currently assigned subjects for the chosen class

## Notes
- The implementation follows the existing setup-page structure used by other admin configuration screens.
- The backend supports both bulk setting of subjects and individual add/delete operations.
