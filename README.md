# 🏆 Player Stats

Full-stack web application for managing football player statistics inside leagues.  
Includes public view, authentication, admin panel, image uploads via Cloudinary, and MongoDB storage.

🔗 **Live demo (frontend):**  
https://playerconnects.netlify.app/

🔗 **Backend API:**  
[https://player-connects-backend.onrender.com/](https://player-connects.onrender.com/)

---

## 📌 Features

### 👥 Public
- View players from the **default league**
- Player cards with rating calculation
- Player details modal
- Responsive UI (Bootstrap)

### 🔐 Authentication
- Login system (JWT)
- Role-based access:
  - `admin`
  - `user`

### 🛠 Admin panel
- Create leagues
- Add / edit / delete players
- Upload & update player photos
- Live rating recalculation
- League-based player management

### 🖼 Images
- Image upload from local computer
- Stored in **Cloudinary**
- Only image URL is saved in MongoDB

---

## 🧱 Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)
- Bootstrap 5
- Font Awesome
- Netlify (hosting)

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT Authentication
- Multer
- Cloudinary
- Render (hosting)

---


---

## 🔄 How image upload works (Cloudinary)

1. Admin selects image file in browser
2. Image is sent as `multipart/form-data`
3. Backend uploads image to **Cloudinary**
4. Cloudinary returns image URL
5. URL is saved in MongoDB
6. Frontend displays image via URL

No images are stored on the server.

---

## 🌍 Environment Variables

Create `.env` file in the backend root:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

DEFAULT_LEAGUE_ID=your_default_league_id


