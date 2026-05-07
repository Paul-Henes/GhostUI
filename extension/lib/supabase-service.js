/**
 * ============================================
 * Supabase Service - Ghost UI Chrome Extension
 * ============================================
 * 
 * REST API wrapper for Supabase integration.
 * Uses direct fetch() calls to Supabase REST API - no SDK required.
 * 
 * PURPOSE:
 * - Optional remote persistence for user accounts and settings
 * - If unavailable, extension falls back to local storage seamlessly
 * 
 * DATABASE TABLES (NORMALIZED SCHEMA):
 * - public.userx: User accounts (id, userx_name, passwordx)
 * - public.userx_settings: User settings (user_id FK, highlight_mode, contrast, font_scale, focus_mode, updated_at)
 * 
 * IMPORTANT: This file is ADDITIVE ONLY - does not modify existing functionality.
 */

// ============================================
// Supabase Configuration
// ============================================
// These values are injected by build-for-chrome.sh or set manually

const SUPABASE_CONFIG = {
  // Supabase Project Configuration
  url: 'https://fsqicehatrtfjddtzazx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcWljZWhhdHJ0ZmpkZHR6YXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjA5NzYsImV4cCI6MjA4NTQzNjk3Nn0.zHbaBjIVbgS9F5cuKXiOrEdH19gBlRiEh1X26qb1CHI',
  // Table names (normalized schema)
  userTable: 'userx',
  settingsTable: 'userx_settings'
};

/**
 * Check if Supabase is configured
 * @returns {boolean} - True if Supabase credentials are set
 */
function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && 
         SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
         SUPABASE_CONFIG.url.includes('supabase');
}

/**
 * Make authenticated request to Supabase REST API
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} - Response data or error
 */
async function supabaseRequest(endpoint, options = {}) {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured', data: null };
  }

  const url = `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_CONFIG.anonKey,
    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
    'Prefer': options.prefer || 'return=representation'
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    // Handle different response types
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data = await response.json();

    if (!response.ok) {
      // Supabase returns error details in response body
      return { 
        data: null, 
        error: data.message || data.error || `HTTP ${response.status}`,
        code: data.code
      };
    }

    return { data, error: null };
  } catch (e) {
    console.warn('[SupabaseService] Request failed:', e.message);
    return { data: null, error: e.message };
  }
}

// ============================================
// Supabase User Service (userx table)
// ============================================

/**
 * Supabase User Service
 * Handles user authentication and settings sync with Supabase
 * 
 * This service is designed to work alongside local auth:
 * - Try Supabase first for login/register
 * - Sync settings to Supabase when available
 * - Fall back gracefully if Supabase is unavailable
 */
class SupabaseUserService {
  constructor() {
    this.currentUserxName = null;
    this.currentUserId = null; // [SUPABASE SETTINGS INTEGRATION – ADDITIVE] Cache user UUID
    this.isConnected = false;
  }

  /**
   * Check if Supabase is available and configured
   * @returns {boolean}
   */
  isAvailable() {
    return isSupabaseConfigured();
  }

  /**
   * Login or Register user with Supabase
   * Strategy: Try insert first, if unique violation -> login with existing user
   * 
   * @param {string} userxName - Username
   * @param {string} passwordHash - SHA-256 hashed password (NEVER plain text)
   * @returns {Promise<{success: boolean, isNewUser?: boolean, error?: string, userData?: Object}>}
   */
  async loginOrRegister(userxName, passwordHash) {
    if (!this.isAvailable()) {
      return { success: false, error: 'Supabase not configured' };
    }

    if (!userxName || !passwordHash) {
      return { success: false, error: 'Username and password hash required' };
    }

    userxName = userxName.trim().toLowerCase();

    try {
      // Step 1: Try to INSERT (register new user)
      // [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
      // Only insert user account data - settings are stored in userx_settings table
      const insertResult = await supabaseRequest(SUPABASE_CONFIG.userTable, {
        method: 'POST',
        body: JSON.stringify({
          userx_name: userxName,
          passwordx: passwordHash
        }),
        prefer: 'return=representation'
      });

      // Insert succeeded - new user created
      if (!insertResult.error && insertResult.data) {
        const userData = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data;
        this.currentUserxName = userxName;
        this.currentUserId = userData.id; // [SUPABASE SETTINGS INTEGRATION – ADDITIVE] Cache user_id
        this.isConnected = true;
        console.log('[SupabaseUser] New user created:', userxName, 'id:', userData.id);
        
        // [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
        // Create default settings row in userx_settings for new user
        await this._createDefaultSettings(userData.id);
        
        return { 
          success: true, 
          isNewUser: true, 
          userData 
        };
      }

      // Check for unique violation (user already exists)
      if (insertResult.code === '23505' || 
          (insertResult.error && insertResult.error.includes('duplicate')) ||
          (insertResult.error && insertResult.error.includes('unique'))) {
        
        // Step 2: User exists - try login by fetching and comparing password
        const selectResult = await supabaseRequest(
          `${SUPABASE_CONFIG.userTable}?userx_name=eq.${encodeURIComponent(userxName)}&select=id,userx_name,passwordx`,
          { method: 'GET' }
        );

        if (selectResult.error || !selectResult.data || selectResult.data.length === 0) {
          return { success: false, error: 'User not found' };
        }

        const user = selectResult.data[0];

        // Compare password hashes (done in code, not SQL - per requirements)
        if (user.passwordx === passwordHash) {
          this.currentUserxName = userxName;
          this.currentUserId = user.id; // [SUPABASE SETTINGS INTEGRATION – ADDITIVE] Cache user_id
          this.isConnected = true;
          console.log('[SupabaseUser] Login successful:', userxName, 'id:', user.id);
          return { 
            success: true, 
            isNewUser: false, 
            userData: user 
          };
        } else {
          return { success: false, error: 'Wrong password' };
        }
      }

      // Other error
      return { success: false, error: insertResult.error || 'Registration failed' };

    } catch (e) {
      console.error('[SupabaseUser] loginOrRegister error:', e);
      return { success: false, error: 'Connection failed' };
    }
  }
  
  // ============================================
  // [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
  // Helper methods for normalized settings table
  // ============================================
  
  /**
   * Create default settings row for a new user
   * @param {string} userId - User UUID from userx table
   * @returns {Promise<boolean>}
   */
  async _createDefaultSettings(userId) {
    if (!userId) return false;
    
    try {
      const result = await supabaseRequest(SUPABASE_CONFIG.settingsTable, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          highlight_mode: false,
          contrast: 100,
          font_scale: 100,
          focus_mode: false
        }),
        prefer: 'return=minimal'
      });
      
      if (result.error) {
        console.warn('[SupabaseUser] Could not create default settings:', result.error);
        return false;
      }
      
      console.log('[SupabaseUser] Default settings created for user:', userId);
      return true;
    } catch (e) {
      console.warn('[SupabaseUser] _createDefaultSettings error:', e.message);
      return false;
    }
  }
  
  /**
   * Get user UUID by username
   * @param {string} userxName - Username
   * @returns {Promise<string|null>} - User UUID or null
   */
  async _getUserIdByName(userxName) {
    if (!userxName) return null;
    
    // Return cached user_id if available
    if (this.currentUserxName === userxName && this.currentUserId) {
      return this.currentUserId;
    }
    
    try {
      const result = await supabaseRequest(
        `${SUPABASE_CONFIG.userTable}?userx_name=eq.${encodeURIComponent(userxName)}&select=id`,
        { method: 'GET' }
      );
      
      if (result.error || !result.data || result.data.length === 0) {
        console.warn('[SupabaseUser] User not found:', userxName);
        return null;
      }
      
      const userId = result.data[0].id;
      
      // Cache the user_id
      if (this.currentUserxName === userxName) {
        this.currentUserId = userId;
      }
      
      return userId;
    } catch (e) {
      console.warn('[SupabaseUser] _getUserIdByName error:', e.message);
      return null;
    }
  }

  /**
   * Load user settings from Supabase
   * [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
   * Now queries userx_settings table by user_id (resolved from userx_name)
   * 
   * @param {string} userxName - Username
   * @returns {Promise<Object|null>} - Settings object or null
   */
  async loadUserSettings(userxName) {
    if (!this.isAvailable() || !userxName) {
      return null;
    }

    try {
      // [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
      // Step 1: Get user_id from userx table
      const userId = await this._getUserIdByName(userxName);
      if (!userId) {
        console.warn('[SupabaseUser] Cannot load settings - user not found:', userxName);
        return null;
      }
      
      // Step 2: Query userx_settings by user_id
      const result = await supabaseRequest(
        `${SUPABASE_CONFIG.settingsTable}?user_id=eq.${userId}&select=highlight_mode,contrast,font_scale,focus_mode`,
        { method: 'GET' }
      );

      if (result.error || !result.data || result.data.length === 0) {
        console.warn('[SupabaseUser] No settings found for user:', userxName);
        return null;
      }

      const dbSettings = result.data[0];
      
      // Map Supabase columns to extension settings format
      const settings = {
        fontSize: dbSettings.font_scale || 100,
        contrast: dbSettings.contrast > 100, // numeric to boolean (>100 = enhanced)
        brightness: 100, // Not stored in Supabase - use default
        lineHeight: 1.5, // Not stored in Supabase - use default
        reduceAnimations: dbSettings.focus_mode || false,
        highlightMode: dbSettings.highlight_mode || false
      };

      console.log('[SupabaseUser] Settings loaded for:', userxName, settings);
      return settings;

    } catch (e) {
      console.error('[SupabaseUser] loadUserSettings error:', e);
      return null;
    }
  }

  /**
   * Save user settings to Supabase
   * [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
   * Now upserts into userx_settings table by user_id (resolved from userx_name)
   * 
   * @param {string} userxName - Username
   * @param {Object} settings - Settings object from extension
   * @returns {Promise<boolean>} - Success status
   */
  async saveUserSettings(userxName, settings) {
    if (!this.isAvailable() || !userxName) {
      return false;
    }

    try {
      // [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
      // Step 1: Get user_id from userx table
      const userId = await this._getUserIdByName(userxName);
      if (!userId) {
        console.warn('[SupabaseUser] Cannot save settings - user not found:', userxName);
        return false;
      }
      
      // [SUPABASE SETTINGS SYNC – FIX ALL FIELDS]
      // Map extension settings to Supabase columns
      // Ensure ALL fields are included with proper type conversions
      const dbSettings = {
        user_id: userId,
        font_scale: typeof settings.fontSize === 'number' ? settings.fontSize : 100,
        contrast: settings.contrast === true ? 120 : 100, // boolean to numeric (enhanced = 120)
        focus_mode: settings.reduceAnimations === true,
        highlight_mode: settings.highlightMode === true,
        updated_at: new Date().toISOString()
      };
      
      // Log the exact values being saved for debugging
      console.log('[SupabaseUser] Saving settings to DB:', dbSettings);

      // Step 2: Upsert into userx_settings
      // Try UPDATE first, if no rows affected, INSERT
      const updateResult = await supabaseRequest(
        `${SUPABASE_CONFIG.settingsTable}?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(dbSettings),
          prefer: 'return=minimal',
          headers: { 'Prefer': 'return=minimal' }
        }
      );

      // Check if update affected any rows by trying to fetch
      const checkResult = await supabaseRequest(
        `${SUPABASE_CONFIG.settingsTable}?user_id=eq.${userId}&select=user_id`,
        { method: 'GET' }
      );
      
      // If no row exists, insert one
      if (!checkResult.data || checkResult.data.length === 0) {
        console.log('[SupabaseUser] No settings row found, creating new one');
        const insertResult = await supabaseRequest(SUPABASE_CONFIG.settingsTable, {
          method: 'POST',
          body: JSON.stringify(dbSettings),
          prefer: 'return=minimal'
        });
        
        if (insertResult.error) {
          console.warn('[SupabaseUser] Could not insert settings:', insertResult.error);
          return false;
        }
      }

      console.log('[SupabaseUser] Settings saved for:', userxName);
      return true;

    } catch (e) {
      console.error('[SupabaseUser] saveUserSettings error:', e);
      return false;
    }
  }

  /**
   * Check if user exists in Supabase
   * @param {string} userxName - Username
   * @returns {Promise<boolean>}
   */
  async userExists(userxName) {
    if (!this.isAvailable() || !userxName) {
      return false;
    }

    try {
      const result = await supabaseRequest(
        `${SUPABASE_CONFIG.userTable}?userx_name=eq.${encodeURIComponent(userxName)}&select=id`,
        { method: 'GET', headers: { 'Prefer': 'count=exact' } }
      );

      return result.data && result.data.length > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get current logged-in Supabase user
   * @returns {string|null}
   */
  getCurrentUser() {
    return this.currentUserxName;
  }
  
  /**
   * [SUPABASE SETTINGS INTEGRATION – ADDITIVE]
   * Get current user's UUID
   * @returns {string|null}
   */
  getCurrentUserId() {
    return this.currentUserId;
  }

  /**
   * Logout from Supabase (clears local state only)
   */
  logout() {
    this.currentUserxName = null;
    this.currentUserId = null; // [SUPABASE SETTINGS INTEGRATION – ADDITIVE] Clear cached user_id
    this.isConnected = false;
    console.log('[SupabaseUser] Logged out');
  }
}

// ============================================
// Global Supabase Service Instance
// ============================================

const supabaseUserService = new SupabaseUserService();

// Log Supabase availability on load
if (isSupabaseConfigured()) {
  console.log('[SupabaseService] Configured and ready');
} else {
  console.log('[SupabaseService] Not configured - using local storage only');
}
