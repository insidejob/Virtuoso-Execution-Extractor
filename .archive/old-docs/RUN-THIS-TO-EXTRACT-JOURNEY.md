# 🚀 QUICK GUIDE: Extract Your Journey Data NOW

## Step 1: Open Your Journey
Go to: https://app2.virtuoso.qa/#/project/4889/goal/8519/v/28737/journey/527286?panel=summary

## Step 2: Open Browser Console
Press `F12` then click `Console` tab

## Step 3: Copy & Paste This Code

```javascript
// COPY ALL OF THIS CODE AND PASTE INTO CONSOLE

(function() {
    console.log('🔍 Extracting Journey 527286 Data...\n');
    
    const data = {
        journey_id: 527286,
        project_id: 4889,
        goal_id: 8519,
        version: 28737,
        steps: [],
        checkpoints: [],
        timestamp: new Date().toISOString()
    };
    
    // Find all step elements (adjust selectors based on what you see)
    document.querySelectorAll('[class*="step"], [class*="Step"], .step-row, .test-step').forEach((el, i) => {
        const stepText = el.textContent.trim();
        if (stepText) {
            data.steps.push({
                number: i + 1,
                content: stepText,
                html: el.innerHTML.substring(0, 200)
            });
        }
    });
    
    // Find checkpoints
    document.querySelectorAll('[class*="checkpoint"], [class*="assert"], [class*="verify"]').forEach((el, i) => {
        const checkText = el.textContent.trim();
        if (checkText) {
            data.checkpoints.push({
                number: i + 1,
                content: checkText
            });
        }
    });
    
    console.log('✅ Extraction Complete!\n');
    console.log(`Found ${data.steps.length} steps`);
    console.log(`Found ${data.checkpoints.length} checkpoints\n`);
    
    // Save to window
    window.journeyData = data;
    
    // Create download function
    window.downloadData = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'journey_527286.json';
        a.click();
    };
    
    console.log('📥 To download: type downloadData()');
    console.log('👁️ To view: type journeyData');
    console.log('📋 To copy: type copy(JSON.stringify(journeyData))');
    
    return data;
})();
```

## Step 4: Get Your Data

After pasting, you'll see the extraction results. Then:

- **To Download**: Type `downloadData()` and press Enter
- **To View**: Type `journeyData` and press Enter
- **To Copy**: Type `copy(JSON.stringify(journeyData))` and press Enter

## 🔍 If That Doesn't Work: Use Network Tab

1. Still in DevTools, click **Network** tab
2. **Refresh the page**
3. Look for requests containing "527286"
4. Click on them and check **Response** tab
5. Copy the JSON you find there

## 💡 What You'll Get

```json
{
  "journey_id": 527286,
  "steps": [
    {
      "number": 1,
      "content": "Navigate to login page"
    },
    {
      "number": 2,
      "content": "Enter username"
    },
    {
      "number": 3,
      "content": "Click submit"
    }
  ],
  "checkpoints": [
    {
      "number": 1,
      "content": "Verify login successful"
    }
  ]
}
```

## ❓ Still Need Help?

The issue is your token (`86defbf4-62a7-4958-a0b4-21af0dee5d7a`) only works for the UI, not the API. To get full API access:

1. In Virtuoso, go to **Settings**
2. Look for **API Keys** or **Integrations**
3. Generate a new **API Token** (different from UI token)

---

**That's it! Run the code above in your browser console right now to extract your journey data.** 🎯