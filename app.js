const P = require('./Promise')


new P((resolve,reject) => {
    reject('eeeeee')
})
    .catch((err) => {
        console.log(err,'err')
    })
    .then((val) => {
        console.log(val, 'done')
    })
