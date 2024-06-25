import firebase from 'firebase/app';
import 'firebase/auth';

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

// Register a new user with email, password, and OTP verification
const registerWithEmailAndOTP = async (email, password) => {
    try {
        const otp = generateOTP();
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Send OTP to the user's email
        sendOTPByEmail(email, otp);

        // Save OTP in Firebase for verification
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({ otp: otp });

    } catch (error) {
        console.error(error.message);
    }
};

// Send OTP to the user's email
const sendOTPByEmail = (email, otp) => {
    // Implement email sending logic here (using a service like SendGrid, Firebase Cloud Functions, etc.)
    console.log(`OTP ${otp} sent to ${email}`);
};

// Verify the entered OTP against the stored OTP
const verifyOTP = async (userId, enteredOTP) => {
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    const storedOTP = userDoc.data().otp;

    if (enteredOTP === storedOTP) {
        console.log('OTP verification successful');
        // Mark email as verified in Firebase Authentication
        await firebase.auth().currentUser.updateEmailVerified(true);
    } else {
        console.log('OTP verification failed');
    }
};

export { registerWithEmailAndOTP, sendOTPByEmail, verifyOTP }
