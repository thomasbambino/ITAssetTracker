const { sql } = require('drizzle-orm');

exports.up = function(db) {
  return db.transaction(async (tx) => {
    // Update existing game_high_scores table to support multiple scores
    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      DROP CONSTRAINT IF EXISTS game_high_scores_game_name_unique;
    `);

    // Rename highScore to score for consistency
    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      RENAME COLUMN high_score TO score;
    `);

    // Make playerName NOT NULL
    await tx.execute(sql`
      UPDATE game_high_scores 
      SET player_name = 'Anonymous' 
      WHERE player_name IS NULL;
    `);

    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      ALTER COLUMN player_name SET NOT NULL;
    `);

    // Add new columns for enhanced game features
    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      ADD COLUMN combo INTEGER DEFAULT 0,
      ADD COLUMN distance INTEGER DEFAULT 0,
      ADD COLUMN weather_condition TEXT DEFAULT 'clear',
      ADD COLUMN time_of_day TEXT DEFAULT 'day';
    `);

    // Remove updatedAt column
    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      DROP COLUMN IF EXISTS updated_at;
    `);

    // Create achievements table
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS game_achievements (
        id SERIAL PRIMARY KEY,
        game_name TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        achieved_at TIMESTAMP DEFAULT NOW(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        UNIQUE(game_name, achievement_id, player_name)
      );
    `);

    console.log('Enhanced game features migration completed');
  });
};

exports.down = function(db) {
  return db.transaction(async (tx) => {
    // Drop achievements table
    await tx.execute(sql`DROP TABLE IF EXISTS game_achievements;`);

    // Revert game_high_scores changes
    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      DROP COLUMN IF EXISTS combo,
      DROP COLUMN IF EXISTS distance,
      DROP COLUMN IF EXISTS weather_condition,
      DROP COLUMN IF EXISTS time_of_day;
    `);

    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      RENAME COLUMN score TO high_score;
    `);

    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    `);

    await tx.execute(sql`
      ALTER TABLE game_high_scores 
      ADD CONSTRAINT game_high_scores_game_name_unique UNIQUE(game_name);
    `);

    console.log('Enhanced game features migration reverted');
  });
};