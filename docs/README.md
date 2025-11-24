# SuperVolcano Robot API Demo Package

Welcome! This package contains everything you need to test and integrate with the SuperVolcano Robot API.

## Quick Start (5 Minutes)

1. **Get your API key** from `API_KEY.txt`

2. **Test the connection:**
   ```bash
   curl -X GET "https://supervolcano-teleops.vercel.app/api/robot/health" \
     -H "X-Robot-API-Key: 9c5eff2e114ebed6a5f93f132cfb9adb7f2dc9c551c9451aa6360237d699284ef"
   ```

3. **Get sample jobs:**
   ```bash
   curl -X GET "https://supervolcano-teleops.vercel.app/api/robot/jobs?limit=3" \
     -H "X-Robot-API-Key: 9c5eff2e114ebed6a5f93f132cfb9adb7f2dc9c551c9451aa6360237d699284ef"
   ```

4. **Read the full documentation:** `ROBOT_API.md`

## What's Included

### 📄 Documentation

- **`ROBOT_API.md`** - Complete API documentation with all endpoints
- **`API_KEY.txt`** - Your API key for quick reference
- **`TROUBLESHOOTING.md`** - Common issues and solutions
- **`DEMO_SCRIPT.md`** - Step-by-step demo guide

### 🔧 Code Examples

- **`examples/test.sh`** - Bash script to test all endpoints
- **`examples/example.py`** - Python integration example
- **`examples/example.js`** - JavaScript/Node.js integration example

### 📮 Postman Collection

- **`SuperVolcano_Robot_API.postman_collection.json`** - Import into Postman for easy testing

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/robot/health` | GET | Check API status |
| `/api/robot/jobs` | GET | Get all jobs |
| `/api/robot/locations` | GET | Get all locations |
| `/api/robot/locations/{id}/jobs` | GET | Get jobs for a location |
| `/api/robot/jobs/{id}/videos` | GET | Get videos for a job |

## Authentication

All requests require an API key header:

```http
X-Robot-API-Key: your_api_key_here
```

## Base URL

```
https://supervolcano-teleops.vercel.app/api/robot
```

## Next Steps

1. **Read `ROBOT_API.md`** for complete documentation
2. **Run `examples/test.sh`** to test all endpoints
3. **Import Postman collection** for interactive testing
4. **Try the code examples** in your preferred language
5. **Check `TROUBLESHOOTING.md`** if you run into issues

## Support

- **Documentation:** See `ROBOT_API.md`
- **Issues:** See `TROUBLESHOOTING.md`
- **Email:** support@supervolcano.com

## What You Can Do

✅ Get all service locations  
✅ Get jobs/tasks for each location  
✅ Download instructional videos  
✅ Filter by priority, category  
✅ Pre-fetch data for offline operation  

## Example Workflow

1. Robot arrives at location
2. Query `/api/robot/locations/{id}/jobs` to get available tasks
3. Select a job
4. Query `/api/robot/jobs/{id}/videos` to get instructional videos
5. Download/stream videos for teleoperator
6. Execute task

---

**Ready to get started?** Open `ROBOT_API.md` and run your first request!

