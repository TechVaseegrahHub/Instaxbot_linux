export interface AuthUser {
    email: string;
    name?: string;
    uid: string;
  }
  
  export interface AuthError {
    message: string;
    code?: string;
  }