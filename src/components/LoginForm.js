import React from 'react';
import loginService from '../services/login';
import featService from '../services/feats';
import userService from '../services/users';
import locationService from '../services/locations';
import propertiesService from '../services/properties';
import firestore from '../firestore';
import FormControl from '../../node_modules/@material-ui/core/FormControl/FormControl';
import Button from '../../node_modules/@material-ui/core/Button/Button';
import Typography from '../../node_modules/@material-ui/core/Typography/Typography';
import TextField from '../../node_modules/@material-ui/core/TextField/TextField';
import Paper from '../../node_modules/@material-ui/core/Paper/Paper';
import Loading from './Loading';
import _ from 'lodash';

class LoginForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            loading: false,
            loadingActive: false,
            message: ''
        };
    }

    login = async (event) => {
        event.preventDefault();
        try {
            const username = this.state.username.trim();
            const password = this.state.password;

            this.setState({ loading: true, loadingActive: true });
            const user = await loginService.login({ username, password }, this.props.store.getState().chosenYear.toString());
            const state = this.props.store.getState();

            this.props.unsubs.forEach(unsub => unsub());

            firestore.setAppYear(state.chosenYear);

            this.props.realtime();

            window.localStorage.setItem('loggedFeatappUser', JSON.stringify(user));

            featService.setToken(user.token);
            userService.setToken(user.token);
            locationService.setToken(user.token);
            propertiesService.setToken(user.token);

            this.setState({ loading: false, loadingActive: false });


            this.props.store.dispatch({
                type: 'LOGIN',
                user
            });
        } catch (exception) {
            const error = _.get(exception, 'request.data.error');
            this.setState({ loading: false, loadingActive: true, message: error ? error : 'Lösenord eller användarnamn fel, alternativt Act of Ruben' });
        }
    };
    render() {
        return (
            <div style={{ width: 'auto', marginLeft: '0px', marginRight: '0px' }}>
                <Paper style={{ display: 'flex', flexDirection: 'column', padding: '40px', alignItems: 'center' }}>
                    <Typography variant="h5">Logga in</Typography>
                    <form style={{ width: '100%' }}>
                        <FormControl margin="normal" fullWidth>
                            <TextField
                                label="Användarnamn"
                                name="username"
                                type="text"
                                value={this.state.username}
                                onChange={(event) => this.setState({ username: event.target.value })}
                                autoCapitalize="false"
                                autoCorrect="false"
                            />
                        </FormControl>
                        <FormControl margin="normal" fullWidth>
                            <TextField
                                label="Lösenord"
                                value={this.state.password}
                                onChange={(event) => this.setState({ password: event.target.value })}
                                type="password"
                                name="password"
                            />
                        </FormControl>
                        <Loading active={this.state.loadingActive} loading={this.state.loading} message={this.state.message}/>
                        <Button style={{ marginTop: '20px' }} variant="contained" color="secondary" onClick={this.login}>Logga in</Button>
                    </form>
                </Paper>
            </div>
        );
    }
}

export default LoginForm;