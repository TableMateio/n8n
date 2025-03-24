# Property Lookup Automation Guide

This document provides instructions for setting up and running automated property lookups for foreclosure data enrichment using n8n and Selenium.

## Overview

The property lookup system is designed to be configurable for different counties, with each county's website having its own configuration. The workflow:

1. Retrieves foreclosure records from Airtable
2. Looks up property details on county property websites
3. Updates Airtable with the enriched data

## Prerequisites

1. Local Docker setup for browser testing (see `docs/local-browser-testing.md`)
2. n8n instance with the required packages installed
3. Airtable with foreclosure data (must include property identifiers like SBL or parcel ID)

## Required n8n Packages

To run Selenium WebDriver in n8n, you'll need to install the following npm packages in your n8n installation:

```bash
# Navigate to your n8n installation directory
cd /path/to/n8n

# Install Selenium WebDriver and Chrome driver
npm install selenium-webdriver
npm install chromedriver
```

## County Configuration System

Our workflow uses a configuration-based approach for different counties. Each county has:

1. A base URL for the property lookup website
2. Selectors for interacting with the website (using CSS, XPath, ID, or linkText)
3. Any county-specific parameters (like default SWIS codes)

Example configuration:

```javascript
"countyConfigs": {
  "Ulster": {
    "baseUrl": "http://imo.ulstercountyny.gov/index.aspx",
    "selectors": {
      "searchButton": {
        "type": "css",
        "value": "input[value=\"Search\"]"
      },
      "resultsTable": {
        "type": "css",
        "value": "table.GridViewStyle"
      }
      // ...more selectors
    },
    "defaultSwis": "106"
  },
  "Dutchess": {
    "baseUrl": "https://gis.dutchessny.gov/parcelaccess/parcelviewer.htm",
    "selectors": {
      // Dutchess-specific selectors
    }
  }
  // Add more counties as needed
}
```

## Running the Property Lookup Workflow

1. Start the Docker container for browser testing:
   ```bash
   docker-compose -f docker-compose.selenium.yml up -d
   ```

2. Open your n8n instance and find the workflow "PROCESS: Foreclosures - Property Info Lookup"

3. Configure the workflow:
   - Set `countyConfigKey` to the county you want to process (e.g., "Ulster")
   - Update Airtable credentials and table information
   - Adjust batch size if needed

4. Run the workflow and monitor the process

## Adding Support for a New County

To add support for a new county:

1. Research the county's property lookup website
2. Identify the search form fields and result elements
3. Add a new entry to the `countyConfigs` object in the workflow
4. Test with a small batch of records before running the full process

## Troubleshooting

### Common Issues

1. **Element not found**: The website structure may have changed. Update the selectors.

2. **Browser connection issues**: Make sure the Docker container is running and ports are correctly mapped.

3. **Timing issues**: Adjust wait times in the workflow code.

4. **CAPTCHA or security measures**: Some county websites implement CAPTCHAs or detect automation, which may require manual intervention.

### Debugging Tips

1. The workflow includes screenshot capabilities for debugging
2. Check the browser view URL to watch the automation in real-time
3. Review the error messages for specific failures

## Best Practices

1. **Start Small**: Test with 1-2 records before running large batches
2. **Time Considerations**: Run during off-peak hours to avoid overloading county websites
3. **Data Validation**: Add validation checks after lookups to ensure data quality
4. **Error Handling**: Implement retry logic for intermittent failures

## References

- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/webdriver/)
- [n8n Documentation](https://docs.n8n.io/)
- [Docker Documentation](https://docs.docker.com/)
