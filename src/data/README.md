# Exchange Table Data

## Overview

The SMART Exchange dashboard table is powered by a simple JSON file.
All table rows are generated automatically from that file — **you never
need to touch the HTML**.

## Files

| File | Purpose |
|---|---|
| `src/data/exchanges.json` | The data source (edit this to add/change rows) |
| `src/scripts/exchanges-table.js` | Reads the JSON and renders the table |

## How to add or edit an entry

1. Open `src/data/exchanges.json`
2. Copy an existing entry and paste it at the end of the array (before the closing `]`)
3. Fill in the fields (see schema below)
4. Save — the table will show the new row on next page load

## Entry schema

```json
{
  "amount": 12345.67,
  "currency": "USD",
  "vendorEntry": "Short Vendor Name",
  "invoice": "INV-001",
  "customer": "Full Customer Name LLC",
  "dateInitiated": "2024-07-15",
  "paymentMethod": "Card",
  "status": "Pending",
  "details": {
    "payment": "Text shown in the expanded Payment Details section",
    "vendor": "Text shown in the expanded Vendor Information section",
    "history": "Text shown in the expanded Transaction History section"
  }
}
```

### Field reference

| Field | Type | Description |
|---|---|---|
| `amount` | number | Dollar/currency value (e.g. `39823.41`) |
| `currency` | string | ISO 4217 code (`USD`, `EUR`, `GBP`, etc.) |
| `vendorEntry` | string | Short vendor name displayed in the table |
| `invoice` | string | Invoice number or reference code |
| `customer` | string | Full customer / company name |
| `dateInitiated` | string | Date in `YYYY-MM-DD` format |
| `paymentMethod` | string | One of: `Card`, `ACH`, `Wire` |
| `status` | string | One of: `Pending`, `Completed`, `Processing`, `Failed` |
| `details.payment` | string | Payment detail shown when row is expanded |
| `details.vendor` | string | Vendor info shown when row is expanded |
| `details.history` | string | Transaction history shown when row is expanded |

### Status badges

Each status gets a different colour badge automatically:

- **Pending** — yellow
- **Completed** — green
- **Processing** — blue
- **Failed** — red

## How it works (for developers)

1. The HTML file has a `<table id="exchanges-table">` with only the `<thead>`
2. On page load, `exchanges-table.js` fetches `exchanges.json` via `fetch()`
3. It loops through the array and generates `<tbody>` blocks (one per row)
4. Each `<tbody>` contains a data row and a hidden detail row (expand/collapse)
5. The script also attaches click handlers for the chevron toggle buttons
6. Pagination info is updated to reflect the total number of entries

> **Note:** Because data is loaded with `fetch()`, you need to serve the
> page through a web server (e.g. `npx serve .` or VS Code Live Server).
> Opening the HTML file directly via `file://` will not work due to CORS.
