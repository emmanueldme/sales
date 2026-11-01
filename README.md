# PulseSales — Real-Time Sales Analytics Dashboard

A modern, responsive, and completely client-side single-page sales analytics dashboard built with vanilla HTML, CSS, and JavaScript.

## Features

- **Executive KPI Cards**: Real-time tracking of Gross Revenue, Net Profit, Total Orders, and Average Order Value (AOV) with period-over-period growth indicators and custom canvas sparklines.
- **Monthly Revenue Quota**: Visual progress tracker against a customizable target quota.
- **Custom HTML5 Canvas Charts** (Zero external dependencies):
  - **Revenue & Net Profit Trajectory**: Interactive Area/Line timeline with dynamic metric selection, daily/monthly views, Bezier curve smoothing, crosshairs, and hover tooltips.
  - **Category Breakdown**: Interactive donut chart with category distribution and legend.
  - **Sales Channel Attribution**: Horizontal bar chart comparing performance across channels.
  - **Top Performing Offerings**: Product leaderboard ranking by volume and revenue.
- **Transaction Ledger**:
  - Live full-text search across customers, products, order IDs, and notes.
  - Multi-criteria filters: Category, Channel, Payment Status (Completed, Pending, Refunded).
  - Sorting and configurable pagination.
- **Data Management & WebStorage**:
  - Add and edit sales records with instant `localStorage` persistence.
  - Export to CSV format.
  - JSON backup snapshots and import restore.
  - Pre-seeded with realistic sample sales transactions.
- **Strict Architecture**:
  - Vanilla HTML5, CSS3, and JavaScript (ES6+).
  - No frameworks, no external charting libraries, no backend requirements.
  - Pure CSS without CSS variables.

## Running Locally

Simply open `index.html` in any modern web browser or serve it using any static HTTP server.
