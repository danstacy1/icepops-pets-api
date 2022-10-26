const express = require('express')
const passport = require('passport')

// pull in Mongoose model for pets
const Pet = require('../models/pet')

const customErrors = require('../../lib/custom_errors')
const handle404 = customErrors.handle404
const requireOwnership = customErrors.requireOwnership
const removeBlanks = require('../../lib/remove_blank_fields')
const requireToken = passport.authenticate('bearer', { session: false })
const router = express.Router()

// ROUTES GO HERE
// we only need three, and we want to set them up using the same conventions as our other routes, which means we might need to refer to those other files to make sure we're using our middleware correctly

// POST -> create a toy
// POST /toys/<pet_id>
router.post('/toys/:petId', removeBlanks, (req, res, next) => {
    // get our toy from req.body
    const toy = req.body.toy
    // get our pet's id from req.params.petId
    const petId = req.params.petId
    // find the pet
    Pet.findById(petId)
        .then(handle404)
        .then(pet => {
            console.log('this is the pet', pet)
            console.log('this is the toy', toy)

            // push the toy into the pet's toys array
            pet.toys.push(toy)

            // save the pet
            return pet.save()
            
        })
        // send the newly updated pet as json
        .then(pet => res.status(201).json({ pet: pet }))
        .catch(next)
})

// UPDATE a toy
// PATCH /toys/<pet_id>/<toy_id>
router.patch('/toys/:petId/:toyId', requireToken, removeBlanks, (req, res, next) => {
    // get the toy and the pet ids saved to variables
    const petId = req.params.petId
    const toyId = req.params.toyId

    // find our pet
    Pet.findById(petId)
        .then(handle404)
        .then(pet => {
            // single out the toy (.id is a subdoc method to find something in an array of subdocs)
            const theToy = pet.toys.id(toyId)
            // make sure the user sending the request is the owner
            requireOwnership(req, pet)
            // update the toy with a subdocument method
            theToy.set(req.body.toy)
            // return the saved pet
            return pet.save()
        })
        .then(() => res.sendStatus(204))
        .catch(next)
})

// DELETE a toy
// DELETE /toys/<pet_id>/<toy_id>
router.delete('/toys/:petId/:toyId', requireToken, (req, res, next) => {
    // get the toy and the pet ids saved to variables
    const petId = req.params.petId
    const toyId = req.params.toyId
    // then we find the pet
    Pet.findById(petId)
        // handle a 404
        .then(handle404)
        // do stuff with the toy(in this case, delete it)
        .then(pet => {
            // we can get the subdoc the same way as update
            const theToy = pet.toys.id(toyId)
            // require that the user deleting this toy is the pet's owner
            requireOwnership(req, pet)
            // call remove on the subdoc
            theToy.remove()

            // return the saved pet
            return pet.save()
        })
        // send 204 no content status
        .then(() => res.sendStatus(204))
        // handle errors
        .catch(next)
})

// export the router
module.exports = router