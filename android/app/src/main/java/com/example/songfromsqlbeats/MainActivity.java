package com.example.songfromsqlbeats;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.navigation.NavController;
import androidx.navigation.fragment.NavHostFragment;
import androidx.navigation.ui.NavigationUI;

import com.google.android.material.bottomnavigation.BottomNavigationView;

import io.clerk.android.Clerk;
import io.clerk.android.Clerk.ClerkResult;
import io.clerk.android.models.User;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        NavHostFragment navHostFragment = (NavHostFragment) getSupportFragmentManager().findFragmentById(R.id.nav_host_fragment);
        NavController navController = navHostFragment.getNavController();
        BottomNavigationView bottomNavigationView = findViewById(R.id.bottom_navigation);
        NavigationUI.setupWithNavController(bottomNavigationView, navController);

        Clerk.getInstance().addOnClerkInitializedListener(this::onClerkInitialized);
    }

    private void onClerkInitialized() {
        Clerk.getInstance().getUser(this, new ClerkResult<User>() {
            @Override
            public void onResult(User result) {
                if (result == null) {
                    startActivity(new Intent(MainActivity.this, LoginActivity.class));
                    finish();
                }
            }

            @Override
            public void onError(Exception e) {
                // Handle error
            }
        });
    }
}
