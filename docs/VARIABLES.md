# Variable System - Quick Reference

## ✅ Correct Syntax

### Extract Variable
```
extract(//*[@id="sourceElement"], {var:variableName})
```

### Use Variable
```
//*[@id="targetElement"]&&${variableName}
```

## 📝 Example

**Google Sheet Setup:**

| Column A (Extract) | Column B (Fill) |
|-------------------|-----------------|
| `extract(//*[@id="investorName2"], {var:cdt})` | `//*[@id="decisionAgencyRegular"]&&${cdt}` |

**What happens:**
1. Extension extracts text from `#investorName2`
2. Stores it in variable `cdt`
3. Fills the value into `#decisionAgencyRegular`

## 🐛 Common Issues

**Variable not substituted?**
- Check console for `SET_VARIABLE` logs
- Run `debug-variables-complete.js` in console
- Verify variable name matches exactly (case-sensitive)

**Extract failed?**
- Check XPath is correct
- Element must exist when extract runs
- Use `waitfor(xpath)` before extract if needed
