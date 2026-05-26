from django.urls import path
from .views import RegisterView,LoginView,MapOrganizationView,AdminUsersListView,AdminUserApproveView,AdminUserDeleteView,AdminOrganizationsListView,AdminOrganizationApproveView,AdminOrganizationDeleteView

urlpatterns=[
    path('register/',RegisterView.as_view(),name='register'),
    path('login/',LoginView.as_view(),name='login'),
    path('map-organization/',MapOrganizationView.as_view(),name='map_organization'),
    path('admin/users/',AdminUsersListView.as_view(),name='admin_users_list'),
    path('admin/users/<int:pk>/approve/',AdminUserApproveView.as_view(),name='admin_user_approve'),
    path('admin/users/<int:pk>/delete/',AdminUserDeleteView.as_view(),name='admin_user_delete'),
    path('admin/organizations/',AdminOrganizationsListView.as_view(),name='admin_organizations_list'),
    path('admin/organizations/<int:pk>/approve/',AdminOrganizationApproveView.as_view(),name='admin_organization_approve'),
    path('admin/organizations/<int:pk>/delete/',AdminOrganizationDeleteView.as_view(),name='admin_organization_delete'),
]
