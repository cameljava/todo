import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface CognitoIdentityProvidersProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  googleClientId?: string;
  googleClientSecret?: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
}

export class CognitoIdentityProviders extends Construct {
  public readonly googleProvider?: cognito.UserPoolIdentityProviderGoogle;
  public readonly facebookProvider?: cognito.UserPoolIdentityProviderFacebook;

  constructor(scope: Construct, id: string, props: CognitoIdentityProvidersProps) {
    super(scope, id);

    const {
      userPool,
      userPoolClient,
      googleClientId,
      googleClientSecret,
      facebookAppId,
      facebookAppSecret,
    } = props;

    // Google Identity Provider
    if (googleClientId && googleClientSecret) {
      this.googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
        userPool,
        clientId: googleClientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      });

      // Add Google as supported identity provider
      userPoolClient.node.addDependency(this.googleProvider);
    }

    // Facebook Identity Provider
    if (facebookAppId && facebookAppSecret) {
      this.facebookProvider = new cognito.UserPoolIdentityProviderFacebook(
        this,
        'FacebookProvider',
        {
          userPool,
          clientId: facebookAppId,
          clientSecret: facebookAppSecret,
          scopes: ['public_profile', 'email'],
          attributeMapping: {
            email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
            givenName: cognito.ProviderAttribute.FACEBOOK_FIRST_NAME,
            familyName: cognito.ProviderAttribute.FACEBOOK_LAST_NAME,
          },
          apiVersion: 'v17.0',
        }
      );

      // Add Facebook as supported identity provider
      userPoolClient.node.addDependency(this.facebookProvider);
    }
  }
}
