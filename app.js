const P = require('./Promise')


new P((resolve) => {
    resolve(1)
})
    .then((val) => {
        console.log(val)

        return new P((resolve, reject) => {
            setTimeout(() => {
                resolve('2')
            }, 2000)
        })
    })
    .then((val) => {
        console.log(val)
        return new Promise((resolve, reject) => {
            resolve('3')
        })
    })
    .then((val) => {
        console.log(val, 'done')
    })
