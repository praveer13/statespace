# broken/

LAB-7.7: copy `views/open.view` here as `broken/open.view` with the deliberate bug enabled (the page
returns `internal_notes`). It stays here beside its cure in `fixed/`, and nothing in this folder is ever
deleted (labs/README.md section 9.3). `statespace check lab7.7` replays it: the paired-state reference
must find a leaking pair in it.
