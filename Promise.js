const nextTick = (() => {
    if (process && process.nextTick) {
        return process.nextTick
    }

    return setTimeout
})()

const STATUS = {
    PENDING : 0,
    RESOLVED: 1,
    REJECTED: 2
}

const _status    = Symbol('status')
const _result    = Symbol('result')
const _callbacks = Symbol('callbacks')

class Promise {
    constructor(exec) {
        if (typeof exec !== 'function') {
            throw new TypeError('Promise constructor argument exec must be a function')
        }

        this[_status]    = STATUS.PENDING
        this[_result]    = null
        this[_callbacks] = []

        try {
            exec(this.resolve.bind(this), this.reject.bind(this))
        } catch (err) {
            this.reject(err)
        }
    }

    resolve(value) {
        nextTick(() => {
            if (this[_status] === STATUS.PENDING) {
                this[_status] = STATUS.RESOLVED
                this[_result] = value
                this[_callbacks].forEach((cb) => cb.onResolved(value))
            }
        })
    }

    reject(reason) {
        nextTick(() => {
            if (this[_status] === STATUS.PENDING) {
                this[_status] = STATUS.REJECTED
                this[_result] = reason
                this[_callbacks].forEach((cb) => cb.onRejected(reason))
            }
        })
    }

    then(onResolved, onRejected) {
        onResolved = typeof onResolved === 'function' ? onResolved : v => v
        onRejected = typeof onRejected === 'function' ? onRejected : r => {
            throw r
        }

        let that         = this
        let childPromise = null
        let value        = null

        function solver(promise, result, resolve, reject) {
            let then    = null
            let settled = false

            if (promise === result) {
                return reject(new Error('Cycle Promises'))
            }

            if (result instanceof Promise) {
                if (result[_status] === STATUS.PENDING) {
                    result.then((value) => solver(promise, value, resolve, reject), reject)
                } else {
                    result.then(resolve, reject)
                }
            }
            else if (result && (typeof result === 'object' || typeof result === 'function')) {
                try {
                    then = result.then
                    if (typeof then === 'function') {
                        then.call(result, (value) => {
                            if (settled) return

                            settled = true
                            return solver(promise, value, resolve, reject)
                        }, (err) => {
                            if (settled) return

                            settled = true
                            return reject(err)
                        })
                    } else {
                        return resolve(result)
                    }
                } catch (err) {
                    if (settled) return

                    settled = true
                    return reject(err)
                }
            }
            else {
                return resolve(result)
            }
        }

        function childExec(value, handle, resolve, reject, childPromise) {
            try {
                value = handle(value)
                solver(childPromise, value, resolve, reject)
            } catch (err) {
                reject(err)
            }
        }

        switch (that[_status]) {
            case STATUS.PENDING:
                childPromise = new Promise((resolve, reject) => {
                    that[_callbacks].push({
                        onResolved: (value) => childExec(that[_result], onResolved, resolve, reject, childPromise),
                        onRejected: (value) => childExec(that[_result], onRejected, resolve, reject, childPromise)
                    })
                })
                break;

            case STATUS.RESOLVED:
                childPromise = new Promise((resolve, reject) => {
                    nextTick(() => childExec(that[_result], onResolved, resolve, reject, childPromise))
                })
                break;

            case STATUS.REJECTED:
                childPromise = new Promise((resolve, reject) => {
                    nextTick(() => childExec(that[_result], onRejected, resolve, reject, childPromise))
                })
                break;

            default:
                throw new Error('Invalid status value')
        }

        return childPromise
    }

    catch(onRejected) {
        return this.then(null, onRejected)
    }
}

module.exports = Promise