# 🤖 AI Integration Setup Guide

## 📋 **Overview**
This guide will help you configure OpenAI GPT-4 and Google Maps API integration for the Mzansi Fleet AI system.

---

## 🔑 **Required API Keys**

### **1. OpenAI GPT-4**
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### **2. Google Maps Platform**
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Routes API** (for route optimization)
   - **Geocoding API** (for address conversion)
   - **Maps JavaScript API** (for visualization)
4. Go to Credentials
5. Create API Key
6. Copy the key

### **3. Azure Cognitive Services (Optional)**
1. Visit [Azure Portal](https://portal.azure.com/)
2. Create a new Cognitive Services resource
3. Select "Speech Services" and "Translator"
4. Get your API key and region

---

## ⚙️ **Configuration Steps**

### **Step 1: Update appsettings.json**
Copy `appsettings.ai.example.json` to `appsettings.json` and add your API keys:

```json
{
  "OpenAI": {
    "ApiKey": "sk-your-openai-api-key-here",
    "BaseUrl": "https://api.openai.com/v1/",
    "DefaultModel": "gpt-4"
  },
  "GoogleMaps": {
    "ApiKey": "your-google-maps-api-key-here",
    "BaseUrl": "https://routes.googleapis.com/"
  },
  "AzureCognitiveServices": {
    "ApiKey": "your-azure-key-here",
    "Region": "your-azure-region"
  }
}
```

### **Step 2: Install Required NuGet Packages**
```bash
dotnet add package System.Text.Json
dotnet add package Microsoft.Extensions.Http
dotnet add package Microsoft.Extensions.Logging
```

### **Step 3: Test the Integration**
```bash
# Start the application
dotnet run

# Test OpenAI integration
curl -X POST "https://localhost:5000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"query":"Hello, I need help with taxi booking","userId":"test","userRole":"passenger"}'

# Test Google Maps integration
curl -X POST "https://localhost:5000/api/ai/optimize-route" \
  -H "Content-Type: application/json" \
  -d '{"origin":"Johannesburg","destination":"Pretoria","waypoints":[]}'
```

---

## 🚀 **Features Enabled**

### **✅ OpenAI GPT-4 Features**
- **Intelligent Chatbot**: Natural language conversations
- **Route Recommendations**: AI-powered trip suggestions
- **Automated Responses**: Customer service automation
- **Intent Recognition**: Understand user needs
- **Multi-language Support**: Context-aware responses

### **✅ Google Maps Features**
- **Route Optimization**: Real-time traffic-aware routing
- **Traffic Data**: Live traffic conditions
- **Geocoding**: Address to coordinate conversion
- **Distance Calculation**: Accurate distance/time estimates
- **Fuel Efficiency**: Route-based fuel consumption

---

## 📊 **Usage Examples**

### **Mobile App Integration**
```javascript
// Chat with AI assistant
const response = await AIService.chatWithAI(
  "What's the best route to Sandton?", 
  "user123", 
  "passenger"
);

// Optimize route
const optimized = await AIService.optimizeRoute(
  ["Midrand", "Centurion"],
  "Johannesburg",
  "Pretoria"
);

// Estimate fare
const fare = await AIService.estimateFare(
  "Johannesburg",
  "Pretoria",
  "standard",
  "morning"
);
```

### **Backend API Usage**
```csharp
// Optimize existing route
var result = await _routeOptimization.OptimizeRoute(route);

// Get traffic data
var traffic = await _externalAI.GetTrafficData(origin, destination);

// Process taxi query
var response = await _externalAI.ProcessTaxiQuery(query, userContext);
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **OpenAI API Errors**
- **Error**: "Invalid API key"
- **Solution**: Verify your OpenAI API key is correct and active
- **Check**: Ensure you have sufficient credits in your OpenAI account

#### **Google Maps API Errors**
- **Error**: "API key invalid"
- **Solution**: Ensure Google Maps APIs are enabled for your project
- **Check**: Verify the API key has the correct permissions

#### **Rate Limiting**
- **Error**: "Rate limit exceeded"
- **Solution**: Implement rate limiting and caching
- **Monitor**: Check API usage in respective dashboards

### **Debug Mode**
Enable detailed logging in `appsettings.json`:
```json
{
  "Logging": {
    "MzansiFleet.Api.Services.AI": "Debug"
  }
}
```

---

## 💰 **Cost Management**

### **OpenAI GPT-4 Pricing**
- **Input Tokens**: $0.03 per 1K tokens
- **Output Tokens**: $0.06 per 1K tokens
- **Estimated Monthly Cost**: $100-500 depending on usage

### **Google Maps Pricing**
- **Routes API**: $7.00 per 1,000 requests
- **Geocoding API**: $5.00 per 1,000 requests
- **Estimated Monthly Cost**: $50-200 depending on usage

### **Cost Optimization Tips**
1. **Cache Results**: Store frequently requested data
2. **Batch Requests**: Combine multiple operations
3. **Use Efficient Models**: Choose appropriate model sizes
4. **Monitor Usage**: Set up alerts for high usage

---

## 🔒 **Security Best Practices**

1. **Never commit API keys to version control**
2. **Use environment variables in production**
3. **Implement rate limiting**
4. **Monitor API usage for anomalies**
5. **Use HTTPS for all API calls**
6. **Implement proper error handling**

---

## 📈 **Monitoring & Analytics**

### **Key Metrics to Track**
- API response times
- Token usage (OpenAI)
- Request counts (Google Maps)
- Error rates
- User satisfaction scores

### **Recommended Tools**
- **Application Insights**: Azure monitoring
- **Google Cloud Monitoring**: API usage tracking
- **OpenAI Dashboard**: Token usage and costs

---

## 🚀 **Next Steps**

1. **Configure API Keys**: Add your keys to `appsettings.json`
2. **Test Integration**: Verify all endpoints work correctly
3. **Implement Caching**: Add Redis or in-memory caching
4. **Set Up Monitoring**: Configure logging and alerts
5. **Deploy to Production**: Follow your deployment process

---

## 📞 **Support**

If you encounter issues:
1. Check the logs in your application
2. Verify API keys and permissions
3. Review API documentation
4. Monitor usage dashboards
5. Contact support for respective services

---

**🎉 Your AI-powered taxi management system is now ready!**

The integration of OpenAI GPT-4 and Google Maps API provides:
- **Intelligent Conversations**: Natural language interactions
- **Smart Routing**: Traffic-aware route optimization
- **Real-time Data**: Live traffic and ETA predictions
- **Cost Efficiency**: Optimized routes and fare estimation

Enjoy the power of AI in your Mzansi Fleet system! 🚀🤖
