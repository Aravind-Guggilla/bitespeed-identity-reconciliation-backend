# Bitespeed Identity Reconciliation

Backend service to identify and link customer contacts using email and phone number.

## Tech Stack

Node.js
Express.js
SQLite

## API Endpoint

POST /identify

Example:

POST https://bitespeed-api.onrender.com/identify

Request Body

{
 "email": "mcfly@hillvalley.edu",
 "phoneNumber": "123456"
}

Response

{
 "contact": {
  "primaryContactId": 1,
  "emails": [
   "lorraine@hillvalley.edu",
   "mcfly@hillvalley.edu"
  ],
  "phoneNumbers": [
   "123456"
  ],
  "secondaryContactIds": [23]
 }
}

## Setup Locally

Clone repo

git clone https://github.com/Aravind-Guggilla/bitespeed-identity-reconciliation-backend

Install dependencies

npm install

Run server

node index.js