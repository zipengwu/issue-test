import {Component, createElement} from 'react'
import Rx from 'rxjs'

let _debug = false;
const debug = (flag) => _debug = flag;

const actionFlow = new Rx.Subject();
const changeFlow = new Rx.Subject();
const stateFlow = new Rx.BehaviorSubject({});

actionFlow.scan((currentState, update) => {
    let change = update instanceof Function ? update(currentState) : update;
    let newState = Object.assign(currentState, change);
    stateFlow.next(newState);
    changeFlow.next(change);
    return newState;
}, {})
    .publish()
    .connect();


const connect = (WrappedComponent, stateInjector = true, actionInjector) => {
    let actionHandlers = {};
    for (let key in actionInjector) {
        actionHandlers[key] = (...params) => actionFlow.next(actionInjector[key](...params));
    }
    class Connect extends Component {
        componentWillMount() {
            this.setState(stateFlow.getValue());
            if (stateInjector instanceof Object && !!Object.keys(stateInjector).length) {
                let nameMapping = [];
                let funcMapping = [];
                for (let key in stateInjector) {
                    if (stateInjector[key] === true) {
                        nameMapping.push(key)
                    }
                    else if (stateInjector[key] instanceof Function) {
                        funcMapping.push(key)
                    }
                }
                if (funcMapping.length > 0) {
                    this.subscription = stateFlow
                        .map(state => {
                            let extract = {};
                            funcMapping.forEach(key => extract[key] = stateInjector[key](state));
                            nameMapping.forEach(key => extract[key] = state[key]);
                            return extract;
                        })
                        .subscribe(state => this.setState(state));
                }
                else {
                    this.subscription = changeFlow
                        .filter(state => {
                            let stateKeys = Object.keys(state);
                            return !!nameMapping.find(prop => stateKeys.includes(prop))
                        })
                        .subscribe(state => this.setState(state));
                }
            }
            else if (stateInjector === true) {
                this.subscription = changeFlow.subscribe(state => this.setState(state));
            }
        }

        componentWillUnmount() {
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
        }

        render() {
            return createElement(WrappedComponent, Object.assign({}, this.state, actionHandlers, this.props));
        }
    }
    return Connect;
}

const next = (state) => actionFlow.next(state);
const initState = (state) => {
    next(currentState => {
        Object.keys(currentState).forEach(key => {
            delete currentState[key]
        });
        return state;
    });
};

let log = (info, state) => {
    if (_debug) {
        console.log(`${info} : ${JSON.stringify(state)}`);
    }
}
const setLogger = (logger) => log = logger;

changeFlow.subscribe(state => log('change', state));
stateFlow.subscribe(state => log('state', state));

export {connect, next, initState, debug, setLogger, stateFlow};