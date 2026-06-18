# Client History Specification

## Purpose

Provide a chronological view of all maintenances performed for a client, with direct links to download their generated PDFs.

## Requirements

### Requirement: Chronological maintenance list

The system SHALL display all maintenances for a client ordered by date descending.

#### Scenario: View client history

- GIVEN a client with 5 past maintenances
- WHEN a técnico opens the client history tab
- THEN maintenances are listed newest first with date, técnico, and item count

#### Scenario: Empty history

- GIVEN a client with zero maintenances
- WHEN the history tab opens
- THEN the system shows an empty state message

### Requirement: PDF download links

The system SHALL provide a download link for each closed maintenance’s PDF.

#### Scenario: Download from history

- GIVEN a closed maintenance with generated PDF
- WHEN a técnico clicks "Download PDF"
- THEN the browser receives the PDF file

#### Scenario: No PDF yet

- GIVEN a maintenance just closed and PDF generation is pending
- WHEN the history list renders
- THEN the download button is disabled with status "Generating..."

### Requirement: Maintenance detail preview

The system SHOULD allow expanding a maintenance row to preview items and action types without opening the PDF.

#### Scenario: Expand row

- GIVEN the history list
- WHEN a técnico taps a maintenance row
- THEN it expands to show equipment names and action type icons
