import { ResourcesConfig } from 'aws-amplify';

const awsConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN || 'http://localhost:3000/'],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT || 'http://localhost:3000/'],
          responseType: 'code',
        },
        email: true,
        username: false,
      },
    },
  },
};

export default awsConfig;
