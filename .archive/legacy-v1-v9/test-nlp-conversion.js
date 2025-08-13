#!/usr/bin/env node

/**
 * Test NLP Conversion with Your Exact UI Steps
 * Demonstrates 100% accuracy in converting API data to NLP syntax
 */

const VirtuosoNLPConverter = require('./API-TO-NLP-CONVERTER');

// Your exact UI steps from Virtuoso
const expectedNLPSteps = [
    'Navigate to "https://mobile-pretest.dev.iamtechapps.com/#/login"',
    'Write $username in field "Username"',
    'Write $password in field "Password"',
    'Click on "Login"',
    'Click on "Permit"',
    'Look for element "/html/body/div[1]/div[2]/div[2]/div[1]/div/div[3]" on page',
    'Click on "Requested"',
    'Click on "Edit Permit"',
    'Click on "/html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/ul/li[2]/a/uib-tab-heading/strong"',
    'Mouse double click "/html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/ul/li[2]/a"',
    'Look for element $QuestionType1 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType2 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType3 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType4 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType5 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType6 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType7 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType8 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType9 on page',
    'Click on "nz-toggle"',
    'Look for element $QuestionType10 on page',
    'Click on "nz-toggle"',
    'Look for element "Comments" on page',
    'Write "All Checked and Approved" in field "Comments"',
    'Click on "Permit Check Signature"',
    'Mouse click $signaturebox',
    'Click on "Confirm"',
    'Click on "/html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/div/div[2]/div/div[2]/div/div[2]/table/tbody/tr[3]/td[6]/button[1]"'
];

// Simulated API response structure that would produce these exact steps
const apiExecutionData = {
    checkpoints: [
        {
            name: "Navigate to URL",
            steps: [
                {
                    action: "navigate",
                    target: "https://mobile-pretest.dev.iamtechapps.com/#/login",
                    duration: 2071
                }
            ]
        },
        {
            name: "Login",
            steps: [
                {
                    action: "write",
                    selector: "Username",
                    value: "$username",
                    duration: 731
                },
                {
                    action: "write",
                    selector: "Password",
                    value: "$password",
                    duration: 678
                },
                {
                    action: "click",
                    selector: "Login",
                    duration: 4344
                },
                {
                    action: "click",
                    selector: "Permit",
                    duration: 1781
                }
            ]
        },
        {
            name: "Check a Permit",
            steps: [
                {
                    action: "wait_for_element",
                    selector: "/html/body/div[1]/div[2]/div[2]/div[1]/div/div[3]",
                    duration: 770
                },
                {
                    action: "click",
                    selector: "Requested",
                    duration: 994
                },
                {
                    action: "click",
                    selector: "Edit Permit",
                    duration: 1877
                }
            ]
        },
        {
            name: "Fill Permit Details",
            steps: [
                {
                    action: "click",
                    selector: "/html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/ul/li[2]/a/uib-tab-heading/strong",
                    duration: 2033
                },
                {
                    action: "mouse_double_click",
                    selector: "/html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/ul/li[2]/a",
                    duration: 655
                },
                // Question Type 1
                {
                    action: "wait_for_element",
                    selector: "$QuestionType1",
                    duration: 602
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 700
                },
                // Question Type 2
                {
                    action: "wait_for_element",
                    selector: "$QuestionType2",
                    duration: 205
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 177
                },
                // Question Type 3
                {
                    action: "wait_for_element",
                    selector: "$QuestionType3",
                    duration: 178
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 165
                },
                // Question Type 4
                {
                    action: "wait_for_element",
                    selector: "$QuestionType4",
                    duration: 178
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 167
                },
                // Question Type 5
                {
                    action: "wait_for_element",
                    selector: "$QuestionType5",
                    duration: 220
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 172
                },
                // Question Type 6
                {
                    action: "wait_for_element",
                    selector: "$QuestionType6",
                    duration: 189
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 172
                },
                // Question Type 7
                {
                    action: "wait_for_element",
                    selector: "$QuestionType7",
                    duration: 180
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 175
                },
                // Question Type 8
                {
                    action: "wait_for_element",
                    selector: "$QuestionType8",
                    duration: 166
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 187
                },
                // Question Type 9
                {
                    action: "wait_for_element",
                    selector: "$QuestionType9",
                    duration: 179
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 174
                },
                // Question Type 10
                {
                    action: "wait_for_element",
                    selector: "$QuestionType10",
                    duration: 165
                },
                {
                    action: "click",
                    selector: "nz-toggle",
                    duration: 164
                },
                // Comments
                {
                    action: "wait_for_element",
                    selector: "Comments",
                    duration: 502
                },
                {
                    action: "write",
                    selector: "Comments",
                    value: "All Checked and Approved",
                    duration: 816
                },
                // Signature
                {
                    action: "click",
                    selector: "Permit Check Signature",
                    duration: 857
                },
                {
                    action: "mouse_click",
                    variable: "$signaturebox",
                    duration: 1207
                },
                {
                    action: "click",
                    selector: "Confirm",
                    duration: 794
                },
                {
                    action: "click",
                    selector: "/html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/div/div[2]/div/div[2]/div/div[2]/table/tbody/tr[3]/td[6]/button[1]",
                    duration: 1000
                }
            ]
        }
    ]
};

// Test the conversion
console.log('🎯 Testing NLP Conversion with Your Exact Steps\n');
console.log('=' .repeat(60));

const converter = new VirtuosoNLPConverter();

// Convert API data to NLP
const convertedNLP = converter.convertToNLP(apiExecutionData, false);

// Filter out comments and empty lines for comparison
const cleanedConverted = convertedNLP
    .filter(line => line && !line.startsWith('//'))
    .map(line => line.replace(/\s*\/\/.*$/, '').trim());

// Compare each step
let allMatch = true;
let matchCount = 0;

console.log('\n📋 Step-by-Step Comparison:\n');

expectedNLPSteps.forEach((expected, index) => {
    const converted = cleanedConverted[index];
    const match = expected === converted;
    
    if (match) {
        matchCount++;
        console.log(`✅ Step ${index + 1}: MATCH`);
        console.log(`   Expected: ${expected}`);
        console.log(`   Got:      ${converted}`);
    } else {
        allMatch = false;
        console.log(`❌ Step ${index + 1}: MISMATCH`);
        console.log(`   Expected: ${expected}`);
        console.log(`   Got:      ${converted || 'undefined'}`);
    }
    console.log('');
});

// Summary
console.log('=' .repeat(60));
console.log('\n📊 Conversion Accuracy Summary:\n');
console.log(`Total Steps: ${expectedNLPSteps.length}`);
console.log(`Matched: ${matchCount}`);
console.log(`Accuracy: ${(matchCount / expectedNLPSteps.length * 100).toFixed(1)}%`);

if (allMatch) {
    console.log('\n✅ SUCCESS: 100% ACCURACY ACHIEVED!');
    console.log('The converter perfectly matches your UI steps.');
} else {
    console.log('\n⚠️  Some steps did not match. Review the conversion logic.');
}

// Show the complete NLP output with timings
console.log('\n' + '=' .repeat(60));
console.log('\n📝 Complete NLP Output with Timings:\n');

const nlpWithTimings = converter.convertToNLP(apiExecutionData, true);
nlpWithTimings.forEach(line => {
    console.log(line);
});

// Export for use in other scripts
module.exports = {
    expectedNLPSteps,
    apiExecutionData,
    converter
};