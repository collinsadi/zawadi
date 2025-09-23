export const isValidPassword = (password: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/.test(
      password
    ); // Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number and one special character (eg) Password@123
  };
  
  