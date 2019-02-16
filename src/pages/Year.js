import React from 'react';
import { HashRouter as Router, Link, Route, Redirect } from 'react-router-dom';
import Home from './Home';
import RecentFeats from './RecentFeats';
import Feats from './Feats';
import Users from './Users';
import Statistics from './Statistics';
import Locations from './Locations';
import Admin from './Admin';
import Login from './Login';
import firestore from '../firestore';
import featService from '../services/feats';
import userService from '../services/users';
import locationService from '../services/locations';
import propertiesService from '../services/properties';
import List from '@material-ui/core/List';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Menu from '@material-ui/icons/Menu';
import moment from 'moment';
import _ from 'lodash';

class Year extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            unsubs: [],
            drawerOpen: false
        };
    }

    async componentDidUpdate(prevProps) {
        if (this.props.year !== prevProps.year) {
            this.props.store.dispatch({ type: 'UPDATE_CHOSEN_YEAR', chosenYear: this.props.year });
            this.state.unsubs.forEach(unsub => unsub());
            await this.logout();
            await this.initData();
        }
    }

    async componentDidMount() {
        window.Chart = require('chart.js');
        this.props.store.dispatch({ type: 'UPDATE_CHOSEN_YEAR', chosenYear: this.props.year });
        await this.initData();
    }

    async componentWillUnmount() {
        this.state.unsubs.forEach(unsub => unsub());
    }

    initData = async () => {
        const state = this.props.store.getState();

        this.state.unsubs.forEach(unsub => unsub());

        firestore.setAppYear(state.chosenYear);

        this.registerRealtimeDataCallbacks();

        const loggedUserJSON = window.localStorage.getItem('loggedFeatappUser');

        if (loggedUserJSON) {
            const user = JSON.parse(loggedUserJSON);
            featService.setToken(user.token);
            userService.setToken(user.token);
            locationService.setToken(user.token);
            propertiesService.setToken(user.token);
        }

        this.props.store.dispatch({
            type: 'UPDATE_USER',
            user: loggedUserJSON ? JSON.parse(loggedUserJSON) : null
        });
    };

    logout = async () => {
        window.localStorage.removeItem('loggedFeatappUser');
        this.props.store.dispatch({
            type: 'LOGOUT'
        });
    };

    registerRealtimeDataCallbacks = () => {
        const locationsCollection = firestore.getCollection('locations');
        const usersCollection = firestore.getCollection('users');
        const featsCollection = firestore.getCollection('feats');
        const activeYearDoc = firestore.getProperties().doc('activeYear');
        const activeYearPropertiesDoc = firestore.getDatabase();
        const availableYearsCollection = firestore.getYears();

        let activeYearUnsub = activeYearDoc.onSnapshot(snapshot => {
            const data = snapshot.data();
            if(data) {
                const activeYear = data.activeYear.toString();
                this.props.store.dispatch({
                    type: 'UPDATE_ACTIVE_YEAR',
                    activeYear
                });
            }
        });

        let activeYearPropertiesUnsub = activeYearPropertiesDoc.onSnapshot(snapshot => {
            const data = snapshot.data();
            if(data) {
                const activeYearProperties = data;
                this.props.store.dispatch({
                    type: 'UPDATE_YEAR_PROPERTIES',
                    startDate: activeYearProperties.startDate,
                    realtimeCutoffTime: activeYearProperties.realtimeCutoffTime,
                    finished: activeYearProperties.finished,
                    info: {
                        what: activeYearProperties.what,
                        why: activeYearProperties.why,
                        when: activeYearProperties.when,
                        where: activeYearProperties.where,
                        start: activeYearProperties.start,
                        finish: activeYearProperties.finish,
                        registration: activeYearProperties.registration,
                        details: activeYearProperties.details,
                        important: activeYearProperties.important
                    }
                });
            }
        });

        let availableYearsUnsub = availableYearsCollection.onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => doc.data());
            if (data) {
                const availableYears = _(data)
                    .map(year => year.year)
                    .reverse()
                    .value();
                this.props.store.dispatch({
                    type: 'UPDATE_AVAILABLE_YEARS',
                    availableYears
                });
            }
        });

        let locationsUnsub = locationsCollection.onSnapshot(snapshot => {
            const locations = snapshot.docs.map(doc => doc.data());
            const sortedLocations = locations.sort((l1, l2) => {
                const name1 = l1.name.toLowerCase();
                const name2 = l2.name.toLowerCase();
                if (name1 < name2) return -1;
                if (name2 < name1) return 1;
                return 0;
            });
            this.props.store.dispatch({
                type: 'UPDATE_LOCATIONS',
                locations: sortedLocations
            });
        });

        let usersUnsub = usersCollection.onSnapshot(snapshot => {
            const users = snapshot.docs.map(doc => doc.data());
            const sortedUsers = users.sort((u1, u2) => u2.points - u1.points);
            this.props.store.dispatch({
                type: 'UPDATE_USERS',
                users: sortedUsers
            });
        });

        let featsUnsub = featsCollection.onSnapshot(snapshot => {
            const feats = snapshot.docs.map(doc => doc.data());
            const sortedFeats = feats.sort((f1, f2) => moment.unix(f2.date).diff(moment.unix(f1.date)));
            const realtimeCutoffTime = this.props.store.getState().realtimeCutoffTime;
            const user = this.props.store.getState().user;
            const sortedFilteredFeats = sortedFeats.filter(feat => (feat.date <= realtimeCutoffTime || this.props.store.getState().finished) || (!!user && (feat.user === user.id || _.get(user, 'type') === 'admin')));
            this.props.store.dispatch({
                type: 'UPDATE_FEATS',
                feats: sortedFilteredFeats
            });
        });

        this.setState({
            unsubs: [locationsUnsub, usersUnsub, featsUnsub, activeYearUnsub, activeYearPropertiesUnsub, availableYearsUnsub]
        });
    };

    toggleDrawer = (open) => () => {
        this.setState({ drawerOpen: open });
    };

    render() {
        const state = this.props.store.getState();

        const menuList = (
            <div>
                <List component="nav">
                    <ListItem button component={Link} to={`/year/${this.props.year}`} data-next={true}>
                        <ListItemText primary="Hemsida"/>
                    </ListItem>
                    {state.user &&
                        <ListItem button component={Link} to={`/year/${this.props.year}/recentfeats`} data-next={true}>
                            <ListItemText primary="Senaste prestationer"/>
                        </ListItem>}
                    {state.user && state.user.type === 'team' &&
                        <ListItem button component={Link} to={`/year/${this.props.year}/feats`} data-next={true}>
                            <ListItemText primary="Egna prestationer"/>
                        </ListItem>}
                    {state.user && state.user.type === 'admin' &&
                    <ListItem button component={Link} to={`/year/${this.props.year}/feats`} data-next={true}>
                        <ListItemText primary="Alla prestationer"/>
                    </ListItem>}
                    {(state.user || this.props.year !== state.activeYear.toString()) &&
                        <ListItem button component={Link} to={`/year/${this.props.year}/users`} data-next={true}>
                            <ListItemText primary="Lag"/>
                        </ListItem>}
                    {(state.user || this.props.year !== state.activeYear.toString()) &&
                        <ListItem button component={Link} to={`/year/${this.props.year}/locations`} data-next={true}>
                            <ListItemText primary="Platser"/>
                        </ListItem>}
                    {(state.user || this.props.year !== state.activeYear.toString()) &&
                        <ListItem button component={Link} to={`/year/${this.props.year}/statistics`} data-next={true}>
                            <ListItemText primary="Statistik"/>
                        </ListItem>}
                    {state.user && state.user.type === 'admin' &&
                        <ListItem button component={Link} to={`/year/${this.props.year}/admin`} data-next={true}>
                            <ListItemText primary="Admin"/>
                        </ListItem>}
                </List>
                <Divider/>
                <List>
                    {state.user ?
                        <ListItem button component={Link} to={`/year/${this.props.year}`} data-next={true} onClick={this.logout}>
                            <ListItemText primary={`Logga ut som ${state.user.name}`}/>
                        </ListItem> :
                        <ListItem button component={Link} to={`/year/${this.props.year}/login`} data-next={true}>
                            <ListItemText primary="Logga in"/>
                        </ListItem>}
                </List>
                <Divider/>
                <List>
                    {_.map(state.availableYears, year =>
                        <ListItem key={year} button component={Link} to={`/year/${year}`} data-next={true}>
                            <ListItemText primary={year}/>
                        </ListItem>)
                    }
                </List>
            </div>
        );
        const styles = {
            root: {
                textAlign: 'center',
                marginBottom: '75px'
            },
            grow: {
                flexGrow: 1
            },
            menuButton: {
                marginLeft: -12,
                marginRight: 20,
            },
        };
        return (
            <Router>
                <div style={{ marginLeft: '20px', marginRight: '20px' }}>
                    <div style={styles.root}>
                        <AppBar position="fixed">
                            <Toolbar style={{ display: 'flex', alignItems: 'center' }} variant="dense">
                                <div>
                                    <IconButton style={styles.menuButton} color="inherit" aria-label="Menu" onClick={this.toggleDrawer(true)}>
                                        <Menu/>
                                    </IconButton>
                                </div>
                                <div>
                                    <Typography variant="h6" color="inherit" style={styles.grow}>
                                    VasagatanTracker {this.props.year}
                                    </Typography>
                                </div>
                            </Toolbar>
                        </AppBar>
                    </div>
                    <SwipeableDrawer open={this.state.drawerOpen} onOpen={this.toggleDrawer(true)} onClose={this.toggleDrawer(false)}>
                        <div
                            tabIndex={0}
                            role="button"
                            onClick={this.toggleDrawer(false)}
                            onKeyDown={this.toggleDrawer(false)}
                        >
                            {menuList}
                        </div>
                    </SwipeableDrawer>

                    <div>
                        <Route exact path='/year/:year' render={() =>
                            <Home store={this.props.store} snack={this.props.snack}/>
                        }/>
                        <Route exact path='/year/:year/recentfeats' render={({ match }) => {
                            if(state.user){
                                return <RecentFeats store={this.props.store} snack={this.props.snack}/>;
                            } else {
                                return <Redirect to={`/year/${match.params.year}/login`}/>;
                            }
                        }}/>
                        <Route exact path='/year/:year/feats' render={({ match }) => {
                            if(state.user){
                                return <Feats store={this.props.store} snack={this.props.snack}/>;
                            } else {
                                return <Redirect to={`/year/${match.params.year}/login`}/>;
                            }
                        }}/>
                        <Route exact path='/year/:year/users' render={({ match }) => {
                            if(state.user || state.activeYear.toString() !== match.params.year){
                                return <Users store={this.props.store} snack={this.props.snack}/>;
                            } else {
                                return <Redirect to={`/year/${match.params.year}/login`}/>;
                            }
                        }}/>
                        <Route exact path='/year/:year/statistics' render={({ match }) => {
                            if(state.user || state.activeYear.toString() !== match.params.year){
                                return <Statistics store={this.props.store} snack={this.props.snack}/>;
                            } else {
                                return <Redirect to={`/year/${match.params.year}/login`}/>;
                            }
                        }}/>
                        <Route exact path='/year/:year/locations' render={({ match }) => {
                            if(state.user || state.activeYear.toString() !== match.params.year){
                                return <Locations store={this.props.store} snack={this.props.snack}/>;
                            } else {
                                return <Redirect to={`/year/${match.params.year}/login`}/>;
                            }
                        }}/>
                        <Route exact path='/year/:year/admin' render={({ match }) => {
                            if(state.user && state.user.type === 'admin'){
                                return <Admin store={this.props.store} snack={this.props.snack}/>;
                            } else {
                                return <Redirect to={`/year/${match.params.year}/login`}/>;
                            }
                        }}/>
                        <Route exact path='/year/:year/login'
                            render={( { match }) => {
                                if(state.user) {
                                    return <Redirect to={`/year/${match.params.year}`}/>;
                                } else {
                                    return <Login store={this.props.store} unsubs={this.state.unsubs}
                                        realtime={this.registerRealtimeDataCallbacks} snack={this.props.snack}/>;
                                }
                            }}/>
                    </div>
                </div>
            </Router>
        );
    }
}

export default Year;