# PDF Generation Specification

## Purpose

Generate server-side PDF reports for closed maintenances, embedding signatures and photos, with professional branded formatting.

## Requirements

### Requirement: Server-side PDF generation

The system SHALL generate PDFs on the server using Puppeteer as the default engine, with PDFKit as a fallback.

#### Scenario: Generate report after close

- GIVEN a closed maintenance with 2 items, photos, and a signature
- WHEN the close endpoint is called
- THEN the backend generates an A4 portrait PDF

#### Scenario: Fallback on Puppeteer failure

- GIVEN Puppeteer fails due to memory constraints
- WHEN the system detects the failure
- THEN it retries generation using PDFKit

### Requirement: Branded header

The system SHALL include a branded header on every page with a logo placeholder and company name placeholder.

#### Scenario: Header renders

- GIVEN a generated PDF
- WHEN page 1 is viewed
- THEN the header contains logo area and "[Company Name]" placeholder

### Requirement: Signature and photo embedding

The system SHALL embed the técnico’s signature and all item-level and maintenance-level photos into the PDF.

#### Scenario: Signature embedded

- GIVEN a maintenance with a base64 PNG signature
- WHEN the PDF is generated
- THEN the signature appears on the final page

#### Scenario: Photos grouped by item

- GIVEN a maintenance with 2 items each having 2 photos
- WHEN the PDF is generated
- THEN item-level photos appear under their respective equipment sections
- AND maintenance-level photos appear on a dedicated "General" page

### Requirement: PDF storage and retrieval

The system SHALL store generated PDFs locally and serve them via a secure endpoint.

#### Scenario: Download PDF

- GIVEN a closed maintenance with generated PDF
- WHEN a técnico requests the PDF endpoint
- THEN the binary is returned with Content-Type application/pdf
