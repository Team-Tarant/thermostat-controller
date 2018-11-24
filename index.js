const express =  require('express')
const noble = require('noble')

const devices = new Map()

const magicalCodes = {
  CHAR_ECO_RESET_ID:'f366dddbebe243ee83c0472ded74c8fa',
  CHAR_ECO_LED_BRIGHTNESS: '0bee30ffed954747bf1b01a60f5ff4fc',
  CHAR_ECO_FORCE_CONTROL: '7bd74f74ffae452ebb61b59b2faf96c9',
  CHAR_ECO_HEATING_MODE: '4eb1d6a219e04809ba554a94e7d9b763',
  CHAR_ECO_FLOOR_LIMITS: '89b4c78f6d5e4cfa8e814eca9738bbfd',
  CHAR_ECO_MONITORING_DATA: 'ecc794d2c7904abd88a579abf9417908',
  CHAR_ECO_TEMPERATURE_MODE: '66ad3e6b31354adabb2b8b22916b21d4'
}

const app = express()

app.get('/devices', (req, res) => {
  res.json(Array.from(devices.values()).map(({id, uuid, address, connectable, advertisement, paired, resetId}) => ({id, uuid, address, connectable, advertisement, paired, resetId})))
})

app.get('/devices/:id', (req, res) => {
  if (!devices.has(req.params.id))
    return res.status(404).json({error: 'Not found'})
  res.json(devices.get(req.params.id))
})

app.get('/devices/:id/:chr', async (req, res) => {
  const pairedDevice = Array.from(devices.values())
    .find(d => d.paired && d.id === req.params.id)
  if (!pairedDevice) {
    return res.status(403).json({error: 'Device not paired'})
  }
  const value = await readValue(pairedDevice.id, magicalCodes[req.params.chr])
  res.json(value)
})

app.get('/devices/paired', (req, res) => {
  const pairedDevices = Array.from(devices.values())
    .filter(d => d.paired)
  res.json(pairedDevices)
})

app.put('/devices/:id', (req, res) => {
  if (!devices.has(req.params.id)) 
    return res.status(404).json({error: 'Not found'})
  connectToDevice(devices.get(req.params.id).peripheral)
})

app.listen(8080, () => {
  console.log('Server listening on 8080')
})

startScanning()

function startScanning() {
  console.log('Now scanning for devices...')
  noble.startScanning([], true)
}

noble.on('discover', peripheral => {
  if (peripheral.rssi < -70) 
    return
  if (!peripheral.advertisement.localName || !String(peripheral.advertisement.localName).startsWith('ECO')) 
    return
  if (!devices.has(peripheral.id)) {
    console.log('New device found: ', peripheral.id)
    const {id, uuid, advertisement, address, connectable} = peripheral
    const {localName, manufacturerData} = advertisement
    devices.set(peripheral.id, {
      id,
      uuid,
      address,
      connectable,
      paired: false,
      resetId: null,
      advertisement: {
        localName: String(localName),
        manufacturerData: manufacturerData ? manufacturerData.toString('ascii') : null
      },
      peripheral
    })
  }
})

function connectToDevice(peripheral) {
  console.log(peripheral)
  console.log('Attempting to connect...')
  if (peripheral.advertisement.manufacturerData && peripheral.advertisement.manufacturerData.toString('ascii').split(';')[1] !== '1') {
    console.log('WARNING: Device is not in pairing mode. Attempting to connect.')
  } else {
    console.log('Device is in pairing mode, now connecting')
  }
  peripheral.connect(err => {
    if (err) {
      console.error(err)
      return
    }
    console.log('Connected :D')
    console.log('Device reset ID', peripheral.deviceResetId)
    console.log('Desiding wether to pair or just authorize')
    if (peripheral.deviceResetId === undefined || peripheral.deviceResetId === null) {
      console.log('Pairing...')
      pair(peripheral)
    } else {
      console.log('Authorizing...')
      authorize(peripheral)
    }
  })
}

function pair(peripheral) {
  console.log('Discover services and stuff...')
  peripheral.discoverAllServicesAndCharacteristics((err, services, chrs) => {
    if (err) {
      console.error('Service discovery error on Pairing ECO')
      return
    }
    console.log(services)
    console.log('Finding deviceResetID characteristics...')
    const deviceResetId = chrs.find(c => c.uuid === magicalCodes.CHAR_ECO_RESET_ID)
    console.log('Doing something asdasdasdasd')
    deviceResetId.read((error, data) => {
      if (error) {
        console.error(error)
        return
      }
      console.log('Writing reset id')
      deviceResetId.write(data, true, err1 => {
        if (err1) {
          console.error(err1)
          return
        } 
        console.log('Reset id:', data)
        const device = devices.get(peripheral.id)
        devices.set(device.id, {...device, paired: true, resetId: data})
      })
    })
  })
}

function authorize(peripheral) {
  peripherl.discoverAllServicesAndCharacteristics((err, services, chrs) => {
    if (err) {
      console.error(err)
      return
    }

    const deviceResetId = chrs.find(c => c.uuid === magicalCodes.CHAR_ECO_RESET_ID)
    deviceResetId.write(devices.get(peripheral.id).resetId, true, err => {
      if (err) {
        return 
      }
      console.log('Authorized')
    })
  })
}

async function readValue(ecoId, chr) {
  return new Promise((resolve, reject) => {
    const device = devices.get(ecoId)
    device.peripheral.discoverAllServicesAndCharacteristics((err, services, chrs) => {
      if (err) {
        return reject(err)
      }

      const ecoValue = chrs.find(c => c.uuid === chr)
      ecoValue.read((error, data) => {
        if (err) {
          return reject(err)
        }
        resolve(data)
        console.log(data ? data.toString('ascii') : null)
      })
    })
  })
}

