import { Amplify } from 'aws-amplify';

Amplify.configure({
    Auth: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_Q5O0QvIyx',
        userPoolWebClientId: '468211ud03v9ppm98q72of67al'
    }
});
