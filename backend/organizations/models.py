from django.db import models

class Organization(models.Model):
    ORGANIZATION_TYPES=(
        ('company','Company'),
        ('institute','Institute'),
    )
    name=models.CharField(max_length=255)
    organization_type=models.CharField(max_length=20,choices=ORGANIZATION_TYPES)
    organization_code=models.CharField(max_length=50,unique=True)
    location=models.CharField(max_length=255)
    website=models.URLField(max_length=255,blank=True,null=True)
    created_by=models.ForeignKey('accounts.User',on_delete=models.SET_NULL,null=True,blank=True,related_name='created_organizations')
    is_approved=models.BooleanField(default=False)
    created_at=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
