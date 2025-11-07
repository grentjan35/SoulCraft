# 🧪 Testing Guide - Fixed Issues

## ✅ What Was Fixed

### 1. **Sprite Loading**
- ✅ Now uses correct sprite name patterns
- ✅ Spartan: `idle spartan`, `movemnt`, `spartan powerup`
- ✅ Warrior: `sprite-256px-16`, `slash`, `powerup`
- ✅ Console logs show loading progress

### 2. **Sprite Scaling**
- ✅ Game now reads `spriteScale` from hitboxes.json
- ✅ Spartan uses 1.5x scale (from your save)
- ✅ Warrior will use its saved scale
- ✅ No more huge sprites!

### 3. **Hitbox Visualization**
- ✅ Press **H** to toggle hitboxes
- ✅ Green boxes use correct scale
- ✅ Red attack boxes appear frame-by-frame
- ✅ Matches dev tools exactly

### 4. **Live Reload**
- ✅ New "🔄 Reload Hitboxes" button in game
- ✅ Click to reload without refreshing page
- ✅ Shows alert when done

## 🎮 Step-by-Step Test

### Test 1: Verify Sprites Load
1. Start server: `node server.js`
2. Open game: `http://localhost:3000`
3. Open browser console (F12)
4. Enter name and select Spartan
5. Click "ENTER ARENA"
6. **Check console** - should see:
   ```
   Loading spartan idle...
     Loaded 16 frames for spartan idle
   Loading spartan walk...
   ...
   ```
7. **Spartan should appear at 1.5x scale** (not huge!)

### Test 2: Verify Hitboxes Work
1. In game, press **H** key
2. Should see green box around Spartan
3. Press **Space** to attack
4. Should see red boxes appear during attack animation
5. Red boxes should match sword swing positions

### Test 3: Test Dev Tools Connection
1. Keep game open
2. Open dev tools: `http://localhost:3000/devtools.html`
3. Select Spartan → Attack
4. Navigate to frame 0
5. Modify an attack hitbox (make it bigger)
6. Press **Ctrl+S** to save
7. **Go back to game**
8. Click **"🔄 Reload Hitboxes"** button
9. Press **H** to show hitboxes
10. Attack (Space) - **hitbox should be bigger!**

### Test 4: Test Scale Changes
1. In dev tools, adjust scale slider to 2.0
2. Press **Ctrl+S**
3. Check server console - should see:
   ```
   ✓ Hitboxes saved and reloaded successfully!
   ```
4. In game, click **"🔄 Reload Hitboxes"**
5. **Spartan should now be 2x scale!**

## 🔍 Debugging Checklist

### Sprites Not Showing?
- [ ] Check browser console for loading errors
- [ ] Verify sprite files exist in folders
- [ ] Look for "Loaded X frames" messages
- [ ] Try refreshing page (Ctrl+R)

### Hitboxes Not Visible?
- [ ] Press **H** key to toggle
- [ ] Check for "Hitboxes: ON" in console
- [ ] Verify hitboxes.json has data
- [ ] Click "🔄 Reload Hitboxes" button

### Changes Not Applying?
- [ ] Save in dev tools (Ctrl+S)
- [ ] Check server console for save confirmation
- [ ] Click "🔄 Reload Hitboxes" in game
- [ ] Verify hitboxes.json file updated

### Sprites Flickering?
- [ ] Check console for loading errors
- [ ] Verify all frames loaded successfully
- [ ] Make sure sprite files aren't corrupted

## 📊 Expected Console Output

### When Game Starts:
```
Loading spartan idle...
  Loaded 16 frames for spartan idle
Loading spartan walk...
  Loaded 16 frames for spartan walk
Loading spartan attack...
  Loaded 16 frames for spartan attack
Loading spartan powerup...
  Loaded 16 frames for spartan powerup
Loading warrior idle...
  Loaded 16 frames for warrior idle
...
Connected to server
```

### When You Press H:
```
Hitboxes: ON
```

### When You Reload Hitboxes:
```
✓ Hitboxes reloaded!
Spartan scale: 1.5
Warrior scale: 3
```

### When Dev Tools Saves:
```
(Server console)
✓ Hitboxes saved and reloaded successfully!
  - Spartan attack hitboxes: 16
  - Warrior attack hitboxes: 0
```

## 🎯 Success Criteria

✅ **Sprites load and display correctly**
✅ **Sprites are properly scaled (not huge)**
✅ **Hitboxes visible when pressing H**
✅ **Changes in dev tools affect game after reload**
✅ **No flickering or missing sprites**
✅ **Attack hitboxes appear during attacks**
✅ **Scale from hitboxes.json is used**

## 💡 Pro Tips

1. **Always check browser console** - it shows loading progress
2. **Use "🔄 Reload Hitboxes" button** - faster than refreshing
3. **Press H to verify** - see hitboxes in real-time
4. **Check server console** - confirms saves are working
5. **Test with 2 browser windows** - verify multiplayer combat

## 🚀 Next Steps

Once everything works:
1. Finish editing Warrior attack hitboxes
2. Test combat between Spartan vs Warrior
3. Fine-tune hitbox sizes
4. Enjoy your epic arena! ⚔️
