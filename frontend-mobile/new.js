    const express = require('express');
    const cors = require('cors'); // Import the package
    const app = express();

    // Use the CORS middleware
    // This will add the necessary headers to allow all origins.
    // For production, you should restrict it to your frontend's actual domain.
    app.use(cors()); 

    // ... rest of your server setup (routes, etc.)
    // For example:
    // app.use('/api/Identity', identityRoutes);

    app.listen(5000, () => {
      console.log('Server is running on port 5000');
    });
    