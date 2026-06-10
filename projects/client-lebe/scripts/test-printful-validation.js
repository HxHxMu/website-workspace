#!/usr/bin/env node
/**
 * Test Printful /orders/estimate-costs endpoint
 * to see if address validation differs from /orders endpoint
 */

const PRINTFUL_API_BASE = 'https://api.printful.com';
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

if (!PRINTFUL_API_KEY) {
  console.error('❌ PRINTFUL_API_KEY not set');
  process.exit(1);
}

async function testAddress(name, address, city, state, zip, country = 'US') {
  const testData = {
    recipient: {
      name,
      email: 'test@example.com',
      phone: '1234567890',
      address1: address,
      city,
      state_code: state.toUpperCase(),
      zip: zip,
      country_code: country.toUpperCase()
    },
    items: [
      {
        sync_variant_id: 3910804393,  // From your Printful products
        quantity: 1
      }
    ],
    currency: 'USD'
  };

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${name}`);
  console.log(`${'='.repeat(70)}`);
  console.log('Request payload:');
  console.log(JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${PRINTFUL_API_BASE}/orders/estimate-costs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const responseBody = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS - Address validated');
      console.log('Response:', JSON.stringify(responseBody, null, 2));
    } else {
      console.log(`❌ FAILED (${response.status})`);
      console.log('Error:', JSON.stringify(responseBody, null, 2));
    }
  } catch (error) {
    console.error('❌ Network/Parse error:', error.message);
  }
}

async function main() {
  console.log('Printful Address Validation Tester');
  console.log('Testing /orders/estimate-costs endpoint');

  // Test 1: Printful's own HQ (known good address)
  await testAddress(
    'Printful HQ',
    '11025 Westlake Dr',
    'Charlotte',
    'NC',
    '28273',
    'US'
  );

  // Test 2: Elizabeth Andrews address (was failing)
  await testAddress(
    'Elizabeth Andrews (Previously Failed)',
    '8262 Duomo Circle',
    'Boynton Beach',
    'FL',
    '33472',
    'US'
  );

  // Test 3: Minimal address (no suite/apt)
  await testAddress(
    'Minimal Address',
    '123 Main St',
    'New York',
    'NY',
    '10001',
    'US'
  );

  console.log(`\n${'='.repeat(70)}`);
  console.log('Testing complete');
  console.log(`${'='.repeat(70)}\n`);
}

main().catch(console.error);
