# Auction Processes

This directory contains process workflows related to auction operations.

## Purpose

Auction processes handle business workflows around auctions including:
- Discovering new auctions
- Monitoring auction status changes
- Processing auction data and attachments
- Analyzing auction results
- Managing auction-related notifications

## Directory Structure

```
workflow-templates/processes/auctions/
├── README.md                    # This file
├── discover-auctions.js         # Process to find new auctions
├── monitor-auction.js           # Process to track auction status changes
├── process-surplus-list.js      # Process to extract foreclosures from surplus lists
└── ...
```

## Implementation Notes

- Auction processes focus on business logic specific to auctions
- They typically call lower-level operations from the operations directory
- Each process should have a clear business objective
- Error handling should be robust with proper reporting
