import { LoginCanvas } from './LoginCanvas'
import './loginScreen.css'
import Lottie from 'react-lottie'
import * as animationData from '../../assets/arrow_right_line.json'
import { useAuthStore } from '../../state/auth'
import { motion } from 'motion/react'

export const LoginScreen = () => {
  const authStore = useAuthStore()
  const defaultAnimIconOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  }

  const onLoginClick = () => {
    authStore.setAccount('', '')
  }

  return (
    <motion.div
      className="login-wrapper"
      layout
      style={{
        top: authStore.loggedIn ? '100vh' : 0,
        bottom: authStore.loggedIn ? '-100vh' : 0,
      }}
    >
      <LoginCanvas />

      <div className="login-screen-container">
        <img src="/login-logo.svg" className="login-logo" />

        <button onClick={onLoginClick} className="login-button">
          <span>Start</span>

          <Lottie
            options={defaultAnimIconOptions}
            height={20}
            width={20}
            isStopped={false}
            isPaused={false}
          />
        </button>
      </div>
    </motion.div>
  )
}
