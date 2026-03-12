INSERT INTO "menu_templates" ("id", "slug", "name", "description", "preview_image_url", "version", "is_active", "created_at", "updated_at") VALUES (
    gen_random_uuid(),
    'coraflow',
    '{"ENG": "CoraFlow"}',
    '{"ENG": "Vibrant glassmorphism design with ambient gradient orbs, teal/orange/pink/blue palette, and smooth animations"}',
    '/template-previews/coraflow-preview.svg',
    '1.0.0',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (slug) DO NOTHING;
