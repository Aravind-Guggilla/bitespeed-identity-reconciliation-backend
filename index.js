const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'identity.db')

const app = express()
app.use(express.json())

let db = null

const PORT = process.env.PORT || 3000



// Intialize DB and start server
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(PORT, () => {
      console.log(`Server Running at ${PORT}`)
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

// get users Returns all contacts (for debugging/testing)
app.get('/users', async (request, response) => {
  const getUsers = `
    select * from contact;
  `
  const users = await db.all(getUsers)
  response.send(users)
})

// converts DB rows into required response format

const convertDbObjectToResponse = contacts => {
  let primaryId = null
  const emails = []
  const phones = []
  const secondaryIds = []

  contacts.forEach(eachItem => {
    // identify primary contact
    if (eachItem.link_precedence === 'primary') {
      primaryId = eachItem.id
    }

    // collect unique emails
    if (eachItem.email && !emails.includes(eachItem.email)) {
      emails.push(eachItem.email)
    }

    // collect unique phone numbers
    if (eachItem.phone_number && !phones.includes(eachItem.phone_number)) {
      phones.push(eachItem.phone_number)
    }

    // collect secondary contact IDs
    if (eachItem.link_precedence === 'secondary') {
      secondaryIds.push(eachItem.id)
    }
  })

  return {
    contact: {
      primaryContactId: primaryId,
      emails: emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaryIds,
    },
  }
}

// main api
app.post('/identify', async (request, response) => {
  const {email, phoneNumber} = request.body

  // getting user details from db

  const getUser = `
    SELECT *
    FROM contact
    WHERE email='${email}'
    OR phone_number='${phoneNumber}';
  `

  const userDetails = await db.all(getUser)

  // CASE 1 : No user exists

  if (userDetails.length === 0) {
    const createNewUser = `
      INSERT INTO contact
      (email, phone_number, link_precedence)
      VALUES
      ('${email}','${phoneNumber}','primary');
    `

    const result = await db.run(createNewUser)

    response.send({
      contact: {
        primaryContactId: result.lastID,
        emails: [email],
        phoneNumbers: [phoneNumber],
        secondaryContactIds: [],
      },
    })

    return
  }

  // CASE 2 : User exists
  else {
    const isPhoneMatched = userDetails.some(
      each => each.phone_number === phoneNumber,
    )

    const isEmailMatched = userDetails.some(each => each.email === email)

    const primary = userDetails.find(each => each.link_precedence === 'primary')

    // Check if primary contact exists
    if (!primary) {
      return response.status(400).send({
        error: 'No primary contact found for the matched users',
      })
    }

    // Same Phone Different Email
    if (isPhoneMatched === true && isEmailMatched === false) {
      const insertSecondary = `
        INSERT INTO contact
        (email, phone_number, linked_id, link_precedence)
        VALUES
        ('${email}','${phoneNumber}',${primary.id},'secondary');
      `

      await db.run(insertSecondary)
    }

    // Same Email Different Phone
    else if (isEmailMatched === true && isPhoneMatched === false) {
      const insertSecondary = `
        INSERT INTO contact
        (email, phone_number, linked_id, link_precedence)
        VALUES
        ('${email}','${phoneNumber}',${primary.id},'secondary');
      `

      await db.run(insertSecondary)
    }

    // Fetch all linked contacts

    const linkedContactsQuery = `
    select * from 
      contact
    where id = ${primary.id}
      or linked_id = ${primary.id};
  `

    const contacts = await db.all(linkedContactsQuery)
    response.send(convertDbObjectToResponse(contacts))
  }
})

module.exports = app
