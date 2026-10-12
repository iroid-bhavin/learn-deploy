import "dotenv/config";

import connectDB from "./config/db";
import app from "./app";
import { seedAdmin } from "./seed";

const PORT = process.env.PORT || 8000;

connectDB().then(async () => {
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(
      `Server is running on Port Number : ${PORT}`
    );
  });
});
