/**
 * Pronoia Auth & Onboarding Service
 * Handles user authentication via Firebase and the multi-step onboarding flow.
 */
export const AuthService = {
  isLoggedIn: false,
  mode: 'login',

  init() {
    const btn = document.getElementById('btn-auth-action');
    const sw = document.getElementById('auth-switch');
    const logoutBtn = document.getElementById('btn-logout');

    if (btn) btn.addEventListener('click', () => this.handleAuth());
    if (sw) sw.addEventListener('click', () => this.toggleMode());
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
    });

    if (localStorage.getItem('px_auth_token')) {
      this.isLoggedIn = true;
    }
  },

  toggleMode() {
    this.mode = this.mode === 'login' ? 'signup' : 'login';
    document.getElementById('auth-title').textContent = this.mode === 'login' ? 'System Access' : 'Create Identity';
    document.getElementById('auth-sub').textContent = this.mode === 'login' ? 'Identity Verification Required' : 'Initialize New Protocol Profile';
    document.getElementById('btn-auth-action').textContent = this.mode === 'login' ? 'Initiate Session' : 'Register Profile';
    document.getElementById('auth-switch').textContent = this.mode === 'login' ? 'Create New Identity Profile' : 'Existing Profile? Sign In';
  },

  async handleAuth() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;

    if (!email || !pass) return;

    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('auth-loading').style.display = 'block';

    if (window.firebase && firebase.auth) {
      try {
        if (this.mode === 'login') {
          await firebase.auth().signInWithEmailAndPassword(email, pass);
        } else {
          await firebase.auth().createUserWithEmailAndPassword(email, pass);
        }
        this.success();
      } catch (err) {
        alert(err.message);
        document.getElementById('auth-form').style.display = 'block';
        document.getElementById('auth-loading').style.display = 'none';
      }
    } else {
      // Fallback for non-firebase environments
      setTimeout(() => this.success(), 1200);
    }
  },

  success() {
    this.isLoggedIn = true;
    localStorage.setItem('px_auth_token', 'px-' + Date.now());
    document.getElementById('auth-overlay').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('auth-overlay').style.display = 'none';
      if (!localStorage.getItem('px_onboarding_done')) {
        document.getElementById('onboarding').style.display = 'flex';
      } else {
        window.dispatchEvent(new CustomEvent('pronoia-auth-success'));
      }
    }, 500);
  },

  logout() {
    if (window.firebase && firebase.auth()) {
      firebase.auth().signOut().then(() => this.clearSession());
    } else {
      this.clearSession();
    }
  },

  clearSession() {
    localStorage.removeItem('px_auth_token');
    localStorage.removeItem('px_onboarding_done');
    localStorage.removeItem('px_block_idx');
    localStorage.removeItem('px_time_left');
    location.reload();
  }
};

export const Onboarding = {
  state: {
    goals: '',
    hrv: 0,
    sleep: 0,
    energy: 7,
    mood: 'focused',
    caffeine: 'none',
    training: 'none'
  },

  next(step) {
    if (step === 1) {
      this.state.goals = document.getElementById('ob-goals').value;
      document.getElementById('ob-1').classList.remove('active');
      document.getElementById('ob-2').classList.add('active');
    } else if (step === 2) {
      this.state.hrv = parseInt(document.getElementById('ob-hrv').value) || 0;
      this.state.sleep = parseInt(document.getElementById('ob-sleep').value) || 0;
      document.getElementById('ob-2').classList.remove('active');
      document.getElementById('ob-2-5').classList.add('active');
    } else if (step === 2.5) {
      this.state.energy = parseInt(document.getElementById('ob-energy').value) || 7;
      this.state.caffeine = document.getElementById('ob-caffeine').value;
      this.state.training = document.getElementById('ob-training').value;
      document.getElementById('ob-2-5').classList.remove('active');
      document.getElementById('ob-3').classList.add('active');
      
      // Trigger protocol generation
      window.dispatchEvent(new CustomEvent('pronoia-ob-complete', { detail: this.state }));
    }
  },

  selectMood(el, mood) {
    document.querySelectorAll('#ob-mood-options .ob-option').forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
    this.state.mood = mood;
  },

  finish() {
    document.getElementById('onboarding').style.opacity = '0';
    document.getElementById('onboarding').style.transition = 'opacity .5s';
    setTimeout(() => { 
      document.getElementById('onboarding').style.display = 'none';
      localStorage.setItem('px_onboarding_done', 'true');
      window.dispatchEvent(new CustomEvent('pronoia-ob-finished'));
    }, 500);
  }
};
