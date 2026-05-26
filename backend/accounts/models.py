from django.db import models
from django.contrib.auth.models import AbstractBaseUser,PermissionsMixin
from .managers import UserManager

class User(AbstractBaseUser,PermissionsMixin):
    ROLE_CHOICES=(
        ('learner','Learner'),
        ('instructor','Instructor'),
        ('organization_admin','Organization Admin'),
    )
    email=models.EmailField(unique=True)
    full_name=models.CharField(max_length=255)
    role=models.CharField(max_length=25,choices=ROLE_CHOICES,default='learner')
    is_approved=models.BooleanField(default=False)
    is_active=models.BooleanField(default=True)
    is_staff=models.BooleanField(default=False)
    is_superuser=models.BooleanField(default=False)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

    objects=UserManager()

    USERNAME_FIELD='email'
    REQUIRED_FIELDS=['full_name']

    def __str__(self):
        return self.email
