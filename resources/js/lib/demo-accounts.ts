export interface DemoAccount {

    role: string;

    label: string;

    email: string;

    /** Plain password for quick login (name-based for staff/teachers). */

    password: string;

}



export const DEMO_ACCOUNTS: DemoAccount[] = [

    { role: 'school-owner', label: 'Super Admin — Sir Ronald', email: 'mruzairahmed0322@gmail.com', password: 'SirRonald' },

    { role: 'admin', label: 'Manager — School Manager', email: 'admin@confostudy.com', password: 'SchoolManager' },

    { role: 'teacher', label: 'Teacher — Sir Ronald Wilfred', email: 'ronald.wilfred@confostudy.com', password: 'SirRonaldWilfred' },

    { role: 'student', label: 'Student — Ali Hassan', email: 'demo.student@confostudy.com', password: 'password' },

    { role: 'parent', label: 'Parent — Rashid Ahmed', email: 'demo.parent@confostudy.com', password: 'password' },

    { role: 'accountant', label: 'Accountant — Kamran Sheikh', email: 'demo.accountant@confostudy.com', password: 'password' },

    { role: 'reception', label: 'Reception — Nadia Hussain', email: 'demo.staff@confostudy.com', password: 'password' },

];



/** Fallback only — prefer account.password from DEMO_ACCOUNTS. */

export const DEMO_PASSWORD = 'password';


