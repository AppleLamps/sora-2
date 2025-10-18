import dotenv from 'dotenv';
import createApp from './app';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
