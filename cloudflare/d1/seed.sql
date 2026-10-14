-- Seed initial demo accounts and jobs for Cloudflare D1
INSERT OR IGNORE INTO users (id, email, password_hash, role, account_status, invite_code, is_demo)
VALUES 
  ('usr_cand_alex', 'alex.backend@example.com', 'scrypt:32768:8:1$K7oT...$demo', 'candidate', 'active', 'INV-ALEX1', 1),
  ('usr_cand_elena', 'elena.datascience@example.com', 'scrypt:32768:8:1$K7oT...$demo', 'candidate', 'active', 'INV-ELENA1', 1),
  ('usr_rec_apex', 'founder@apexfoundry.example.com', 'scrypt:32768:8:1$K7oT...$demo', 'recruiter', 'active', 'INV-APEX1', 1);

INSERT OR IGNORE INTO candidate_profiles (id, user_id, name, email, headline, work_authorization, min_salary, skills, is_demo)
VALUES
  ('prof_cand_alex', 'usr_cand_alex', 'Alex Chen', 'alex.backend@example.com', 'Staff Backend Engineer (Engineering & AI)', 'Authorized to work in US (Citizen or PR)', 175000, '["Python", "Go", "PostgreSQL", "FastAPI", "Kubernetes", "Distributed Systems"]', 1),
  ('prof_cand_elena', 'usr_cand_elena', 'Elena Rostova', 'elena.datascience@example.com', 'Senior Data Scientist & ML Researcher (Engineering & AI)', 'Authorized to work in US (Citizen or PR)', 180000, '["Python", "PyTorch", "NLP", "LLMs", "Vector Databases", "Statistical Modeling"]', 1);

INSERT OR IGNORE INTO companies (id, employer_id, name, website, work_email, industry, stage)
VALUES
  ('comp_apex', 'usr_rec_apex', 'Apex Foundry', 'https://apexfoundry.example.com', 'founder@apexfoundry.example.com', 'Artificial Intelligence', 'Seed');

INSERT OR IGNORE INTO jobs (id, employer_id, company_id, company, company_name, title, function, seniority, location, salary_min, salary_max, status, is_demo)
VALUES
  ('job_backend_lead', 'usr_rec_apex', 'comp_apex', 'Apex Foundry', 'Apex Foundry', 'Founding Backend Engineer', 'Engineering', 'Senior level', 'Remote', 160000, 200000, 'published', 1),
  ('job_ai_researcher', 'usr_rec_apex', 'comp_apex', 'Apex Foundry', 'Apex Foundry', 'Lead AI Systems Engineer', 'Engineering', 'Staff level', 'Remote', 180000, 220000, 'published', 1);

-- Seed initial pending invitations
INSERT OR IGNORE INTO invitations (id, inviter_id, token, status)
VALUES
  ('inv_demo_0', 'usr_cand_alex', 'rec_launch_seed1', 'pending'),
  ('inv_demo_1', 'usr_cand_alex', 'cross_alpha1', 'pending'),
  ('inv_demo_2', 'usr_cand_alex', 'cross_alpha2', 'pending'),
  ('inv_demo_3', 'usr_cand_elena', 'cross_beta1', 'pending');

-- Seed master launchrec user
INSERT OR IGNORE INTO users (id, email, password_hash, role, account_status, invite_code, is_demo)
VALUES ('usr_launchrec', 'launchrec.noreply@gmail.com', '02vn2onmv092bkaosm2', 'candidate', 'active', 'INV-LAUNCH', 0);

INSERT OR IGNORE INTO candidate_profiles (id, user_id, name, email, headline, work_authorization, min_salary, skills, is_demo)
VALUES ('prof_launchrec', 'usr_launchrec', 'Launch Rec Member', 'launchrec.noreply@gmail.com', 'Senior Full-Stack Engineer', 'Authorized to work in US (Citizen or PR)', 150000, '["Python", "FastAPI", "React", "TypeScript", "PostgreSQL"]', 0);

