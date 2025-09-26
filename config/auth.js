const NextAuth = require('next-auth');
const { prisma } = require('../lib/prisma');

const authOptions = {
  providers: [
    {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      version: '2.0',
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      params: { grant_type: 'authorization_code' },
      accessTokenUrl: 'https://oauth2.googleapis.com/token',
      requestTokenUrl: 'https://oauth2.googleapis.com/oauth/v2/auth',
      authorizationUrl: 'https://oauth2.googleapis.com/oauth/v2/auth?response_type=code',
      profileUrl: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      }
    }
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Check if user exists in database, if not create them
        const existingUser = await prisma.userProfile.findUnique({
          where: { email: user.email }
        });

        if (!existingUser) {
          // Create new user profile
          await prisma.userProfile.create({
            data: {
              id: user.id, // NextAuth will provide the user ID
              email: user.email,
              fullName: user.name,
              avatarUrl: user.image,
            }
          });
        } else {
          // Update existing user profile with latest info
          await prisma.userProfile.update({
            where: { id: user.id },
            data: {
              fullName: user.name,
              avatarUrl: user.image,
            }
          });
        }

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      // Persist user ID to token
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

module.exports = { authOptions };
