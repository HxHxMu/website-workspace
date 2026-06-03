# Printful Support Ticket #5093934 — Technical Follow-up

**Subject:** Address validation failure persists across all US addresses, including Printful HQ — API v1 /orders/estimate-costs endpoint

**Date:** June 2, 2026

---

## Summary
The reported address validation error **"Shipping address state and ZIP code don't match"** is not an address format issue. Testing with three separate US addresses—including Printful's own headquarters—all fail with the identical error message on both `/orders` and `/orders/estimate-costs` endpoints.

---

## Test Results

We tested the `/orders/estimate-costs` endpoint (which performs the same validation as `/orders`) with three addresses:

### Test 1: Printful HQ (11025 Westlake Dr, Charlotte, NC 28273)
```json
{
  "recipient": {
    "name": "Printful HQ",
    "email": "test@example.com",
    "phone": "1234567890",
    "address1": "11025 Westlake Dr",
    "city": "Charlotte",
    "state_code": "NC",
    "zip_code": "28273",
    "country_code": "US"
  },
  "items": [{"sync_variant_id": 6477600, "quantity": 1}],
  "currency": "USD"
}
```

**Response:** ❌ 400 Bad Request
```
Recipient: Shipping address state and ZIP code don't match. Enter the correct state or ZIP code.
```

### Test 2: Elizabeth Andrews (8262 Duomo Circle, Boynton Beach, FL 33472)
```json
{
  "recipient": {
    "address1": "8262 Duomo Circle",
    "city": "Boynton Beach",
    "state_code": "FL",
    "zip_code": "33472",
    "country_code": "US"
  }
  // ...
}
```

**Response:** ❌ 400 Bad Request — Identical error message

### Test 3: Minimal Test Address (123 Main St, New York, NY 10001)
**Response:** ❌ 400 Bad Request — Identical error message

---

## Key Findings

1. **Validation logic is identical across endpoints**
   - `/orders` and `/orders/estimate-costs` both fail with the same error
   - This rules out endpoint-specific bugs

2. **Error is not address-format related**
   - Proper 2-letter state codes (NC, FL, NY) ✓
   - 5-digit ZIP codes ✓
   - No punctuation, spaces, or special characters ✓
   - Country code: US ✓

3. **Error is deterministic**
   - All three addresses fail consistently
   - No variations in response
   - Suggests a systemic issue in the validation logic itself

4. **Addresses verified externally**
   - Printful HQ is a known-good address (your own company)
   - Elizabeth Andrews address passes USPS validation (as discussed in previous message)

---

## Request for Technical Team

1. **Root cause investigation**: The ZIP/state validation logic on the backend is rejecting all US addresses submitted via API. Can the Tech Team:
   - Check if there's a configuration issue with the validation rules?
   - Confirm if this is affecting all API users or just this account?
   - Review the validation logic for `/orders` and `/orders/estimate-costs` endpoints?

2. **Comparison with v2 API**: Is this validation error present in Printful API v2 (beta)? If v2 has been updated with more lenient validation, we could migrate there.

3. **Workaround timeline**: How long is this expected to take to resolve? In the meantime, is there an `ignore_address_validation` flag or similar in v1 that we can use to proceed with orders?

---

## Impact

- **Production blocker**: Cannot fulfill orders via API
- **User experience**: Checkout fails after payment is confirmed (high customer impact)
- **Scope**: Affects all US shipping addresses

---

## Testing Environment
- **API Version:** v1 (not beta v2)
- **Endpoints tested:** `/orders` and `/orders/estimate-costs`
- **Request format:** Standard JSON with authenticated Bearer token
- **Error response:** Consistent 400 Bad Request

**Ticket ID:** #5093934
