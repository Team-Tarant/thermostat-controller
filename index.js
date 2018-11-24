const express =  require('express')
const noble = require('noble')

const devices = new Map()

const CHAR_ECO_RESET_ID = 'f366dddbebe243ee83c0472ded74c8fa'
const CHAR_ECO_LED_BRIGHTNESS = '0bee30ffed954747bf1b01a60f5ff4fc'
const CHAR_ECO_FORCE_CONTROL = '7bd74f74ffae452ebb61b59b2faf96c9'
const CHAR_ECO_HEATING_MODE = '4eb1d6a219e04809ba554a94e7d9b763'
const CHAR_ECO_FLOOR_LIMITS = '89b4c78f6d5e4cfa8e814eca9738bbfd'
const CHAR_ECO_MONITORING_DATA = 'ecc794d2c7904abd88a579abf9417908'
const CHAR_ECO_TEMPERATURE_MODE = '66ad3e6b31354adabb2b8b22916b21d4'

const app = express()

app.get('/devices', (req, res) => {
  res.json(Array.from(devices.values()))
})

app.get('/devices/:id', (req, res) => {

})

app.get('/devices/:id/state', (req, res) => {

})

app

app.listen(8080, () => {
  console.log('Server listening on 8080')
})

startScanning()

function startScanning() {
  console.log('Now scanning for devices...')
  noble.startScanning([], true)
}

noble.on('discover', peripheral => {
  if (peripheral.rssi < -70) return
  if (!String(peripheral.advertisement.localName).startsWith('ECO')) return
  if (!devices.has(peripheral.id)) {
    console.log('New device found: ', peripheral.id)
    const {id, uuid, advertisement, address, connectable} = peripheral
    const {localName, manufacturerData} = advertisement
    devices.set(peripheral.id, {
      id,
      uuid,
      address,
      connectable,
      advertisement: {
        localName: String(localName),
        manufacturerData: manufacturerData ? manufacturerData.toString('ascii') : null
      }
    })
  }
})

