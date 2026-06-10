import { Routes } from '@angular/router';
import { ShoppingPageComponent } from './features/shopping/shopping-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { GroupPageComponent } from './features/group/group-page.component';

export const routes: Routes = [
  { path: '', component: ShoppingPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'group', component: GroupPageComponent },
  { path: 'join/:inviteCode', component: ShoppingPageComponent },
  { path: '**', redirectTo: '' }
];
