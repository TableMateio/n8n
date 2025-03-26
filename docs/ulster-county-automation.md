# Ulster County Property Lookup Automation Guide

This document provides instructions for setting up and running automated interactions with the Ulster County property lookup website using n8n and Selenium.

## Prerequisites

1. Local Docker setup for browser testing (see `docs/local-browser-testing.md`)
2. n8n instance with the required packages installed

## Required n8n Packages

To run Selenium WebDriver in n8n, you'll need to install the following npm packages in your n8n installation:

```bash
# Navigate to your n8n installation directory
cd /path/to/n8n

# Install Selenium WebDriver and Chrome driver
npm install selenium-webdriver
npm install chromedriver
```

## Test Workflow

We've created a test workflow that demonstrates how to interact with the Ulster County property lookup website. This workflow:

1. Provides a link to view the browser automation in real-time
2. Waits for user confirmation before starting the automation
3. Connects to the browser via Selenium WebDriver
4. Navigates to the Ulster County IMO website
5. Interacts with the search form to look up a property by SBL

### Running the Test Workflow

1. Start the Docker container for browser testing:
   ```bash
   docker-compose -f docker-compose.selenium.yml up -d
   ```

2. Open your n8n instance and find the workflow "LOCAL TEST: Ulster County Browser"

3. Run the workflow and copy the browser view URL from the output of the "Show Browser Link" node

4. Open the browser view URL in your web browser to see the automation

5. Click the "Wait for Viewer" manual trigger in n8n to start the automation

6. Watch the automation run in the browser window

## Common Interaction Patterns

### Navigating the IMO Website

The Ulster County IMO website has several navigation patterns to be aware of:

1. Initial Public Access Link:
   ```javascript
   const publicAccessLink = await driver.findElement(By.linkText('Click Here for Public Access'));
   await publicAccessLink.click();
   ```

2. Agreement Button:
   ```javascript
   const agreeButton = await driver.findElement(By.css('input[value="I Agree"]'));
   await agreeButton.click();
   ```

3. SBL Search Form:
   ```javascript
   // Select municipality (SWIS code)
   const municipalitySelect = await driver.findElement(By.css('select[name="selectmun"]'));
   await municipalitySelect.sendKeys('106'); // Kingston City

   // Fill in SBL parts
   await driver.findElement(By.css('input[name="swis"]')).sendKeys(sblParts[0]);
   await driver.findElement(By.css('input[name="section"]')).sendKeys(sblParts[1]);
   await driver.findElement(By.css('input[name="block"]')).sendKeys(sblParts[2]);
   await driver.findElement(By.css('input[name="lot"]')).sendKeys(sblParts[3]);

   // Click search button
   const searchButton = await driver.findElement(By.css('input[value="Search"]'));
   await searchButton.click();
   ```

### Extracting Property Information

After searching for a property, you can extract information from the results page:

```javascript
// Wait for results to load
await driver.wait(until.elementLocated(By.css('table.GridViewStyle')), 10000);

// Extract property information
const ownerName = await driver.findElement(By.xpath('//td[contains(text(), "Owner")]/following-sibling::td[1]')).getText();
const propertyAddress = await driver.findElement(By.xpath('//td[contains(text(), "Address")]/following-sibling::td[1]')).getText();
const assessedValue = await driver.findElement(By.xpath('//td[contains(text(), "Total Assessment")]/following-sibling::td[1]')).getText();
```

## Production Implementation

For production use, we recommend:

1. Using a dedicated n8n instance with the required packages installed
2. Implementing error handling and retry logic
3. Scheduling workflows to run during off-peak hours
4. Adding logging and monitoring for automation runs
5. Implementing credential management for any required login information

## Troubleshooting

### Common Issues

1. **Element not found**: The website structure may have changed. Update the selectors.

2. **Browser connection issues**: Make sure the Docker container is running and ports are correctly mapped.

3. **Timing issues**: Adjust wait times using `sleep()` or explicit waits:
   ```javascript
   await driver.wait(until.elementLocated(By.id('elementId')), 10000);
   ```

4. **CAPTCHA or security measures**: If the website implements CAPTCHAs or detects automation, you may need to adjust your approach.

### Debugging Tips

1. Take screenshots during critical steps:
   ```javascript
   const screenshot = await driver.takeScreenshot();
   ```

2. Log page source for inspection:
   ```javascript
   const pageSource = await driver.getPageSource();
   console.log(pageSource);
   ```

3. Use explicit waits for elements:
   ```javascript
   await driver.wait(until.elementLocated(By.css('.element-class')), 10000);
   ```

## References

- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/webdriver/)
- [Ulster County IMO Website](http://imo.ulstercountyny.gov/index.aspx)
- [n8n Documentation](https://docs.n8n.io/)
